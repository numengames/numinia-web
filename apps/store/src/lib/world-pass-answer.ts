/**
 * «Entrar» (cut 5): POST /api/mundos/<worldId>/pass. A person presses Entrar
 * on a world's page; this works out what they may do in THAT world's
 * organization — asking the till, the one place that decides (`access` and
 * `roles`, exactly as the panel does) — signs a short pass (lib/world-pass.ts)
 * and answers the world's address with the pass after `#`:
 *
 *   { url: "https://<world host>/#pass=<token>", pass: true }
 *
 * No session, a world nobody has placed, or a person who is not of its
 * organization (nor the house): no pass, `{ url: "https://<world host>/",
 * pass: false }` — the engine gives guests the `@todos` role. A world the
 * fleet does not have is 404; an Origin that is not ours is 403 (the pass is
 * for the page that asked, never for another site); no signing key is 503
 * (the page then falls back to the plain guest link). The pass is private to
 * the browser that asked and never stored.
 */

import { z } from 'zod';
import type { AccountDesk, Asker } from './accounts';
import { WorldPassError, buildPassPayload, signPass } from './world-pass';
import { answer, ask, readWorldId } from './worlds-homes';
import { logEvent } from './telemetry';

type Log = (event: Readonly<Record<string, unknown>>) => void;

/** What the route works out from its environment, so the answer stays pure. */
export interface PassContext {
  /** The world's id as the address names it. */
  readonly worldId: string;
  /** The fleet's world ids with the host each is served at. */
  readonly hosts: ReadonlyMap<string, string>;
  /** The origin of the page that must be asking (`https://numinia.com`). */
  readonly origin: string;
  /** The Origin header of the request, if it sent one. */
  readonly requestOrigin: string | null;
  /** WORLD_PASS_PRIVATE_KEY. */
  readonly privateKey: string | undefined;
  /** AUTH_SESSION_SECRET, the HMAC key of the person's opaque id. */
  readonly secret: string | undefined;
  /** Seconds since the epoch. */
  readonly now: number;
}

/** The world's address for a guest: no pass. */
export const guestUrl = (host: string): string => `https://${host}/`;

/** The world's address carrying a pass after `#`, which no server ever sees. */
export const passUrl = (host: string, token: string): string => `https://${host}/#pass=${token}`;

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const role = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().nullable(),
  position: z.number(),
});
const SHAPES = {
  homeOf: z.union([
    z.object({
      ok: z.literal(true),
      home: z.object({ accountId: z.string() }).passthrough().nullable(),
      manage: z.boolean(),
    }),
    refusal,
  ]),
  access: z.union([
    z.object({
      ok: z.literal(true),
      as: z.enum(['owner', 'house', 'member']),
      permissions: z.array(z.string()),
    }),
    refusal,
  ]),
  roles: z.union([
    z.object({
      ok: z.literal(true),
      roles: z.array(role.passthrough()),
      members: z.array(
        z
          .object({
            wallet: z.string(),
            roleIds: z.array(z.string()),
            name: z.string().nullable().optional(),
          })
          .passthrough(),
      ),
    }),
    refusal,
  ]),
} as const;

const noPass = (host: string): Response => answer({ url: guestUrl(host), pass: false });

/** POST /api/mundos/<worldId>/pass. */
export async function answerPass(
  desk: AccountDesk | null,
  asker: Asker | null,
  context: PassContext,
  log: Log = logEvent,
): Promise<Response> {
  if (context.requestOrigin !== null && context.requestOrigin !== context.origin) {
    return answer({ error: 'forbidden' }, 403);
  }
  const id = readWorldId(context.worldId);
  const host = id === undefined ? undefined : context.hosts.get(id);
  if (id === undefined || host === undefined) return answer({ error: 'not-found' }, 404);
  if (asker === null || desk === null) return noPass(host);
  const wallet = asker.wallet.toLowerCase();

  const home = await ask(log, 'homeOf', () => desk.homeOf(id, wallet, asker.house), SHAPES.homeOf);
  if (!home.ok) return home.response;
  if ('problems' in home.value || home.value.home === null || !home.value.manage) {
    return noPass(host);
  }
  const org = home.value.home.accountId;

  const [access, roles] = await Promise.all([
    ask(log, 'access', () => desk.access(wallet, org, asker.house), SHAPES.access),
    ask(log, 'roles', () => desk.roles(wallet, org, asker.house), SHAPES.roles),
  ]);
  if (!access.ok) return access.response;
  if (!roles.ok) return roles.response;
  if ('problems' in access.value || 'problems' in roles.value) return noPass(host);

  try {
    if (context.secret === undefined || context.secret === '') throw new WorldPassError('no-key');
    const payload = await buildPassPayload({
      aud: id,
      org,
      secret: context.secret,
      wallet,
      access: access.value,
      roles: roles.value,
      now: context.now,
    });
    const token = await signPass(context.privateKey, payload);
    return answer({ url: passUrl(host, token), pass: true });
  } catch (error) {
    log({
      level: 'error',
      kind: 'world-pass',
      rule: error instanceof WorldPassError ? error.code : 'threw',
    });
    return answer({ error: 'no-pass', url: guestUrl(host) }, 503);
  }
}
