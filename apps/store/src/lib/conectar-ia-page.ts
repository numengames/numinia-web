/**
 * «MCP remoto», stories W4 and W6: the «Conecta tu IA» consent page,
 * /conectar-ia/ in five locales, and its POST /api/conectar-ia. The decision
 * itself is W3's (lib/conectar-ia.ts `connectAi`); this file is what the
 * page reads and what the POST answers; the hand-off of the token to the
 * relay is lib/relay-handoff.ts.
 *
 * ## The request contract (the relay, `apps/mcp`, is its only caller)
 *
 * IN — the relay's `/authorize` sends the browser to
 *
 *     https://numinia.com[/<locale>]/conectar-ia/?app=<name>&host=<host>&req=<id>
 *
 *   - `app`: the MCP client's name for itself («Claude»), free text; shown,
 *     never obeyed, cut to its first 40 characters (`readClient`);
 *   - `host`: the host of its redirect URI (`claude.ai`, `localhost`),
 *     without scheme or port — shown in large type, with a warning apart
 *     when it is this computer (`isLoopback`);
 *   - `req`: the relay's one-time id of this authorization request
 *     (16–128 of `[A-Za-z0-9_-]`).
 *   Each is checked with Zod and the page fails closed: one missing or
 *   wrong and it shows no form, only «go back to your AI and ask again».
 *   The relay keeps `req` 10 minutes and once; the POST asks it (`check`)
 *   whether it is still waiting for `req` with this very `app` and `host`
 *   before any AI is made, so an edited link connects nothing.
 *
 * OUT — the page posts JSON (same origin) to /api/conectar-ia:
 *
 *     { req, app, host, accountId, ai: { kind: 'new', name } |
 *       { kind: 'again', agentId }, roleId: string | null, hear?: boolean }
 *
 *   (`hear`, the consent's unchecked checkbox: whether the AI may hear nearby
 *   chat, off when absent) and gets `200 { ok: true, connection: { req, action, accountId,
 *   agentId, name, via, hear }, next }`. The AI's token is NEVER in the
 *   answer: it goes to the relay through its service binding (`handOff`,
 *   lib/relay-handoff.ts), which seals it for the browser that started the
 *   request and answers `next`, the relay's `/vuelta?req=…`, where the
 *   page sends the browser. With the fixture (CI, screenshots) `next` is
 *   null and the page says «done, go back to your app». A refusal answers
 *   `{ ok: false, refusal }` — a key of i18n/conectar-ia.ts `refusals`
 *   (400 unreadable or a request the relay is not waiting for, 401 signed
 *   out, 403 not allowed or `forbidden` cross-site, 404 no such AI, 409 the
 *   name is taken, 502/503 the till or the relay); a body that is not JSON,
 *   the store's usual `{ error }` (415/413/400).
 *
 * ## CSRF
 *
 * As every signed-in write of the store: the session cookie is SameSite
 * Strict (pages/api/auth/login.ts), the body must be JSON (`bodyOf`, 415
 * otherwise — a cross-site form cannot send it without a preflight) and,
 * as the world pass (lib/world-pass-answer.ts), the `Origin` must be this
 * site's — here it must also be present: a POST without it is refused, 403.
 */

import { z } from 'zod';
import type { AccountDesk, Asker } from './accounts';
import { answer, ask, bodyOf, whoIs, type Log } from './accounts-source';
import { newToken, type FreshToken } from './agents';
import {
  connectAi,
  isLoopback,
  readClient,
  reconnectable,
  type ConnectOutcome,
} from './conectar-ia';
import type { Relay } from './relay-handoff';
import { logEvent } from './telemetry';

/** The page, without its locale prefix. */
export const CONSENT_PATH = '/conectar-ia/';

/** Where the page posts. */
export const CONSENT_API = '/api/conectar-ia';

/** Where the page sends a person with no community to add an AI in («Tus comunidades»). */
export const COMMUNITIES_PATH = '/belong/';

/** Where the connected AIs are listed and switched off (Panel › Agentes). */
export const AGENTS_PANEL_PATH = '/panel/agentes/';

/**
 * The host cut after each dot, so the page can let the line break between the
 * pieces and never inside one (`machine-1031.` `agents.` `nousresearch.` `com`):
 * a host broken mid-word («nousresearch.co / m») reads as another machine, and
 * this is the one thing the person must read right. The pieces joined are the host.
 */
export function hostLabels(host: string): string[] {
  return host.split(/(?<=\.)/);
}

const REQUEST_ID = /^[A-Za-z0-9_-]{16,128}$/;

let built: ReturnType<typeof buildShapes> | null = null;

function buildShapes() {
  const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
  const query = z.object({
    app: z.string().min(1).max(200),
    host: z.string().min(1).max(253),
    req: z.string().regex(REQUEST_ID),
  });
  const body = z.object({
    req: z.string(),
    app: z.string(),
    host: z.string(),
    accountId: z.string().min(1).max(64),
    ai: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('new'), name: z.string().max(200) }),
      z.object({ kind: z.literal('again'), agentId: z.string().min(1).max(64) }),
    ]),
    roleId: z.string().min(1).max(64).nullable(),
    hear: z.boolean().default(false),
  });
  const overview = z.union([
    z.object({
      accounts: z.array(
        z.object({ id: z.string(), kind: z.string(), name: z.string().nullable() }),
      ),
    }),
    refusal,
  ]);
  const agents = z.union([
    z.object({
      ok: z.literal(true),
      mayCreate: z.boolean(),
      assignableRoles: z.array(z.object({ id: z.string(), name: z.string() })),
      agents: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          auth: z.enum(['key', 'token']),
          enabled: z.boolean(),
          hears: z.boolean().default(false),
          roleIds: z.array(z.string()),
          assignable: z.array(z.string()),
          mayEdit: z.boolean(),
        }),
      ),
    }),
    refusal,
  ]);
  return { query, body, overview, agents };
}

const shapes = (): ReturnType<typeof buildShapes> => (built ??= buildShapes());

// ---- What the page was asked ----------------------------------------------

/** Who asks and where it goes back to, as the page shows them. */
export interface ConsentAsk {
  /** The app's name, cut to 40 characters. */
  readonly app: string;
  /** The host it returns to, lower case. */
  readonly host: string;
  /** The relay's one-time request id. */
  readonly req: string;
  /** It returns to this computer: the page warns apart. */
  readonly loopback: boolean;
}

/** The page's query, or null when any of the three is missing or wrong (fail closed). */
export function readConsentAsk(search: string): ConsentAsk | null {
  const params = new URLSearchParams(search);
  const parsed = shapes().query.safeParse({
    app: params.get('app') ?? undefined,
    host: params.get('host') ?? undefined,
    req: params.get('req') ?? undefined,
  });
  if (!parsed.success) return null;
  const client = readClient({ name: parsed.data.app, redirectHost: parsed.data.host });
  if (client === null) return null;
  return {
    app: client.app,
    host: client.host,
    req: parsed.data.req,
    loopback: isLoopback(client.host),
  };
}

/** The page's own address with its ask, for the sign-in door to come back to. */
export const consentHref = (ask: ConsentAsk): string =>
  `${CONSENT_PATH}?${new URLSearchParams({ app: ask.app, host: ask.host, req: ask.req }).toString()}`;

// ---- What the person may pick ---------------------------------------------

/** One role on offer: its id and its name. */
export interface ConsentRole {
  readonly id: string;
  readonly name: string;
}

/** An AI already connected the token way that the person may reconnect. */
export interface ConsentAgain {
  readonly id: string;
  readonly name: string;
  /** The roles that may be given to it now (beyond the ones it keeps). */
  readonly roles: readonly ConsentRole[];
}

/** One organization where the person may add an AI, or reconnect one. */
export interface ConsentOrg {
  readonly accountId: string;
  readonly name: string;
  /** A new AI may be made here (the till's `mayCreate`). */
  readonly mayCreate: boolean;
  /** The roles a new AI may be given (the till's `assignableRoles`). */
  readonly roles: readonly ConsentRole[];
  readonly again: readonly ConsentAgain[];
}

export type ConsentChoices =
  | { readonly ok: true; readonly orgs: readonly ConsentOrg[] }
  | { readonly ok: false; readonly reason: 'signed-out' | 'unavailable' };

/**
 * The organizations of the person's own accounts where they may add an AI
 * (or reconnect one of `reconnectable`), with the roles they may give,
 * from the till's `agents` answer to them. The house's entries are not
 * listed: the house does not answer for an AI. An organization the till
 * refuses or fails on is left out; an overview that fails is `unavailable`.
 */
export async function consentChoices(
  desk: AccountDesk | null,
  asker: Asker | null,
  log: Log = logEvent,
): Promise<ConsentChoices> {
  if (asker === null) return { ok: false, reason: 'signed-out' };
  if (desk === null) return { ok: false, reason: 'unavailable' };
  const { you } = whoIs(asker);
  // Always as the person, never as the house (even for the house's Oracle): the
  // till would otherwise make a non-owner Oracle act `as: 'house'`, which may not create.
  const house = false;
  const overview = await ask(log, 'consent-overview', () => desk.overview(you), shapes().overview);
  if (!overview.ok || !('accounts' in overview.value)) return { ok: false, reason: 'unavailable' };
  const teams = overview.value.accounts.filter((account) => account.kind === 'team');
  const read = await Promise.all(
    teams.map(async (team): Promise<ConsentOrg | null> => {
      const asked = await ask(
        log,
        'consent-agents',
        () => desk.agents(you, team.id, house),
        shapes().agents,
      );
      if (!asked.ok || !asked.value.ok) return null;
      const view = asked.value;
      const roles = view.assignableRoles.map(({ id, name }) => ({ id, name }));
      const again = reconnectable(view).map((agent) => ({
        id: agent.id,
        name: agent.name,
        roles: roles.filter(
          (role) => agent.assignable.includes(role.id) && !agent.roleIds.includes(role.id),
        ),
      }));
      if (!view.mayCreate && again.length === 0) return null;
      return {
        accountId: team.id,
        name: team.name ?? team.id,
        mayCreate: view.mayCreate,
        roles,
        again,
      };
    }),
  );
  return { ok: true, orgs: read.filter((org): org is ConsentOrg => org !== null) };
}

// ---- The POST -------------------------------------------------------------

/** The connection as the browser may see it: everything but the token. */
export interface ConsentConnection {
  readonly req: string;
  readonly action: 'create' | 'renew';
  readonly accountId: string;
  readonly agentId: string;
  readonly name: string;
  readonly via: string;
  readonly hear: boolean;
}

/** The context of one POST: this site's origin and the request's. */
export interface ConsentContext {
  readonly origin: string;
  readonly requestOrigin: string | null;
}

type Failure = Extract<ConnectOutcome, { ok: false }>;

/** Each refusal of `connectAi` with its status: unreadable 400, not allowed 403, the till 502/503. */
const STATUS: Readonly<Record<Failure['refusal'], number>> = {
  client: 400,
  name: 400,
  'not-token': 400,
  'signed-out': 401,
  'no-permission': 403,
  house: 403,
  limit: 403,
  role: 403,
  'other-organization': 403,
  'not-below': 403,
  till: 403,
  'no-such-agent': 404,
  taken: 409,
  failed: 502,
  unavailable: 503,
};

const no = (refusal: string, status: number): Response => answer({ ok: false, refusal }, status);

/** A relay's «no» as the POST answers it: a request it is not waiting for, 400; down, 503. */
const RELAY_STATUS = { request: 400, unavailable: 503 } as const;

/**
 * POST /api/conectar-ia: connect the AI the person allowed and hand its
 * token to the relay, or say why not. Without a relay (no binding, not the
 * fixture) nothing is made: 503.
 */
export async function answerConsent(
  desk: AccountDesk | null,
  asker: Asker | null,
  request: Request,
  context: ConsentContext,
  relay: Relay | null,
  log: Log = logEvent,
  draw: () => Promise<FreshToken> = newToken,
): Promise<Response> {
  if (context.requestOrigin === null || context.requestOrigin !== context.origin) {
    return no('forbidden', 403);
  }
  if (asker === null) return no('signed-out', 401);
  if (desk === null || relay === null) return no('unavailable', 503);
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const parsed = shapes().body.safeParse(body.json);
  if (!parsed.success) return no('request', 400);
  const sent = parsed.data;
  const consentAsk = readConsentAsk(
    new URLSearchParams({ app: sent.app, host: sent.host, req: sent.req }).toString(),
  );
  if (consentAsk === null) return no('request', 400);
  // Before anything is made: is the relay waiting for this request, as the page showed it?
  const waiting = await relay.check(consentAsk);
  if (waiting !== 'ok') return no(waiting, RELAY_STATUS[waiting]);

  const outcome = await connectAi(
    desk,
    asker,
    {
      accountId: sent.accountId,
      client: { name: consentAsk.app, redirectHost: consentAsk.host },
      ai:
        sent.ai.kind === 'new'
          ? sent.ai
          : { kind: 'again', accountId: sent.accountId, agentId: sent.ai.agentId },
      roleId: sent.roleId,
      hear: sent.hear,
    },
    log,
    draw,
  );
  if (!outcome.ok) return no(outcome.refusal, STATUS[outcome.refusal]);
  const connection: ConsentConnection = {
    req: consentAsk.req,
    action: outcome.action,
    accountId: outcome.accountId,
    agentId: outcome.agentId,
    name: outcome.name,
    via: outcome.via,
    hear: outcome.hear,
  };
  // By rule only: never the token, never the request id.
  log({ level: 'info', kind: 'agent-consent', action: connection.action, via: connection.via });
  // Made: the token goes to the relay and nowhere else. Should the relay
  // refuse now (its 10 minutes ran out meanwhile), nobody holds the token,
  // which is harmless — the panel's «renew» or the next consent gives a fresh one.
  const kept = await relay.handOff(connection, outcome.token);
  if (!kept.ok) return no(kept.refusal, RELAY_STATUS[kept.refusal]);
  return answer({ ok: true, connection, next: kept.next });
}
