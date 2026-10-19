/**
 * «MCP remoto», story W6: how numinia.com gives an AI's fresh token to the
 * relay (`apps/mcp`, https://mcp.numinia.com) without the browser ever
 * carrying it.
 *
 * The relay's Worker exposes a named RPC entrypoint, `HandOffDesk`, and this
 * Worker is bound to it (`MCP_HANDOFF` in the root wrangler.jsonc). An RPC
 * entrypoint has no address: nothing on the internet can call it, only a
 * Worker that declares the binding — the till's desks work the same way. So:
 *
 * 1. before making the AI, `ask(req)`: is the relay still waiting for this
 *    request, and did it send the page the same app and host the page shows?
 *    A link edited to say «Claude» while it returns elsewhere, a request past
 *    its 10 minutes or already used → `request` (no AI is made);
 * 2. after the till made it (or renewed its token), `keep({ req, accountId,
 *    agentId, via, hear, token })`: the relay seals the token at once to a
 *    key only the browser that started the request holds, and answers
 *    `next`, its own `/vuelta?req=…`, where the browser goes.
 *
 * The token travels only inside Cloudflare, from this Worker to the relay's.
 * It is never in the POST's answer, a URL, a log line or an error text, and
 * nothing here keeps it. Without the binding the consent cannot finish
 * (`unavailable`); with `DATA_SOURCE=fixture` (CI, screenshots) a relay that
 * accepts every request and keeps nothing stands in, so the page says
 * «done» as before.
 */

import { z } from 'zod';
import { readClient } from './conectar-ia';
import { logEvent } from './telemetry';

type Log = (event: Readonly<Record<string, unknown>>) => void;

/** The relay's origin: its `/vuelta` is the only `next` the store sends a browser to. */
export const RELAY_ORIGIN = 'https://mcp.numinia.com';

/** Where the browser goes once the relay holds the sealed token. */
export const vueltaHref = (req: string): string =>
  `${RELAY_ORIGIN}/vuelta?${new URLSearchParams({ req }).toString()}`;

/** The relay's `HandOffDesk`, as the binding exposes it (answers checked here). */
export interface RelayDesk {
  ask(req: string): Promise<unknown>;
  keep(handOff: RelayHandOff): Promise<unknown>;
}

/** What the relay is handed: the connection the person allowed, and its token. */
export interface RelayHandOff {
  readonly req: string;
  readonly accountId: string;
  readonly agentId: string;
  readonly via: string;
  readonly hear: boolean;
  readonly token: string;
}

/** What the consent page showed: the request id, the app and the host. */
export interface RelayAsk {
  readonly req: string;
  readonly app: string;
  readonly host: string;
}

export type RelayCheck = 'ok' | 'request' | 'unavailable';

export type RelayKept =
  | { readonly ok: true; readonly next: string | null }
  | { readonly ok: false; readonly refusal: 'request' | 'unavailable' };

/** The consent's side of the relay. */
export interface Relay {
  /** Is the relay waiting for this request, with this app and host? */
  check(ask: RelayAsk): Promise<RelayCheck>;
  /** Give it the token; where the browser goes next (null: stay and say «done»). */
  handOff(connection: Omit<RelayHandOff, 'token'>, token: string): Promise<RelayKept>;
}

let built: ReturnType<typeof buildShapes> | null = null;

function buildShapes() {
  const no = z.object({ ok: z.literal(false) });
  return {
    asked: z.union([z.object({ ok: z.literal(true), app: z.string(), host: z.string() }), no]),
    kept: z.union([z.object({ ok: z.literal(true), next: z.string() }), no]),
  };
}

const shapes = (): ReturnType<typeof buildShapes> => (built ??= buildShapes());

/**
 * One call to the relay: its answer in `shape`, or `unavailable` when the
 * call throws or answers something else. Logged by outcome only: never the
 * arguments, never the error's text (neither may hold the token).
 */
async function call<T>(
  log: Log,
  action: string,
  run: () => Promise<unknown>,
  shape: z.ZodType<T>,
): Promise<T | 'unavailable'> {
  try {
    const parsed = shape.safeParse(await run());
    if (parsed.success) return parsed.data;
    log({ level: 'warn', kind: 'relay-handoff', action, outcome: 'answer-shape' });
  } catch {
    log({ level: 'warn', kind: 'relay-handoff', action, outcome: 'threw' });
  }
  return 'unavailable';
}

/** The relay behind its binding. */
export function relayOf(desk: RelayDesk, log: Log = logEvent): Relay {
  return {
    async check(ask) {
      const asked = await call(log, 'ask', () => desk.ask(ask.req), shapes().asked);
      if (asked === 'unavailable') return asked;
      if (!asked.ok) return 'request';
      // The relay's name and host, read as the page reads its query.
      const sent = readClient({ name: asked.app, redirectHost: asked.host });
      return sent !== null && sent.app === ask.app && sent.host === ask.host ? 'ok' : 'request';
    },
    async handOff(connection, token) {
      const kept = await call(
        log,
        'keep',
        () =>
          desk.keep({
            req: connection.req,
            accountId: connection.accountId,
            agentId: connection.agentId,
            via: connection.via,
            hear: connection.hear,
            token,
          }),
        shapes().kept,
      );
      if (kept === 'unavailable') return { ok: false, refusal: 'unavailable' };
      if (!kept.ok) return { ok: false, refusal: 'request' };
      // Only the relay's own way back for this very request.
      if (kept.next !== vueltaHref(connection.req)) {
        log({ level: 'warn', kind: 'relay-handoff', action: 'keep', outcome: 'next' });
        return { ok: false, refusal: 'unavailable' };
      }
      return { ok: true, next: kept.next };
    },
  };
}

/**
 * The fixture's relay (`DATA_SOURCE=fixture`: CI, screenshots, the dev
 * server): every request is waiting and the token is kept nowhere — the AI
 * is made and nobody holds its token, which is harmless (the panel's
 * «renew» gives a fresh one). The page says «done».
 */
export const fixtureRelay: Relay = {
  check: async () => 'ok',
  handOff: async () => ({ ok: true, next: null }),
};

/** The binding as a desk, or null when it is not one (an RPC stub may be a callable object). */
export function boundRelay(binding: unknown, log: Log = logEvent): Relay | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<keyof RelayDesk, unknown>>;
  if (typeof desk.ask !== 'function' || typeof desk.keep !== 'function') return null;
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as RelayDesk;
  return relayOf({ ask: (req) => stub.ask(req), keep: (handOff) => stub.keep(handOff) }, log);
}

/** The relay for this Worker: the binding, else the fixture's when the data is the fixture. */
export function relayFrom(env: {
  readonly binding: unknown;
  readonly dataSource: string | undefined;
}): Relay | null {
  return boundRelay(env.binding) ?? (env.dataSource === 'fixture' ? fixtureRelay : null);
}
