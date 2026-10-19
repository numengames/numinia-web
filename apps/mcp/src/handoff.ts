/**
 * The relay's side of the hand-off (story W6): the request `/authorize`
 * leaves waiting in KV, and the desk numinia.com calls through its service
 * binding to check that request and hand over the AI's fresh token.
 *
 * `HandOffDesk` is a named RPC entrypoint of this Worker. Like the till's
 * desks, an RPC entrypoint has no address: only a Worker that declares a
 * binding to it can call it — numinia.com's (`MCP_HANDOFF` in the root
 * wrangler.jsonc). So the token goes from the store's Worker to this one
 * inside Cloudflare, never through a browser and never through a URL, and
 * the relay seals it to the request's key the moment it arrives (seal.ts).
 * Nothing here writes a log line.
 */
import type { AuthRequest } from '@cloudflare/workers-oauth-provider';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { z } from 'zod';
import { ORIGIN, REQUEST_TTL_SECONDS, VUELTA_PATH } from './config';
import type { Env } from './env';
import { seal, toBase64Url, type Sealed } from './seal';

/** A request id: what the consent page accepts (16–128 of `[A-Za-z0-9_-]`). */
export const REQUEST_ID = /^[A-Za-z0-9_-]{16,128}$/;

/** A fresh request id: 32 random bytes, base64url (43 characters). */
export function newRequestId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/** The name of a request's own cookie: one per request, so two tabs do not collide. */
export const cookieName = (req: string): string => `__Host-vuelta-${req}`;

/** The `Set-Cookie` of a request's cookie; `null` clears it. */
export function requestCookie(req: string, value: string | null): string {
  const age = value === null ? 0 : REQUEST_TTL_SECONDS;
  return `${cookieName(req)}=${value ?? ''}; Max-Age=${age}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

const PENDING = 'vuelta:req:';
const SEALED = 'vuelta:sealed:';

/** A request waiting for its consent. */
export interface Pending {
  /** The authorization request as the library parsed and validated it. */
  readonly authRequest: AuthRequest;
  /** What the consent page was told: the client's name and the host it returns to. */
  readonly app: string;
  readonly host: string;
  /** The request's public key (seal.ts); its private half is in the cookie. */
  readonly publicKey: string;
  /** SHA-256 of the cookie's value. */
  readonly cookieHash: string;
  /** Unix seconds; KV forgets it by then too. */
  readonly expiresAt: number;
}

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export async function savePending(env: Env, req: string, pending: Pending): Promise<void> {
  await env.OAUTH_KV.put(`${PENDING}${req}`, JSON.stringify(pending), {
    expirationTtl: REQUEST_TTL_SECONDS,
  });
}

/** The waiting request, or null when there is none or it is past its time. */
export async function readPending(env: Env, req: string): Promise<Pending | null> {
  const pending = await env.OAUTH_KV.get<Pending>(`${PENDING}${req}`, 'json');
  return pending !== null && pending.expiresAt > nowSeconds() ? pending : null;
}

/** The sealed hand-off of a request, or null. */
export async function readSealed(env: Env, req: string): Promise<Sealed | null> {
  return env.OAUTH_KV.get<Sealed>(`${SEALED}${req}`, 'json');
}

/** One use: the request and its hand-off are gone, whatever happens next. */
export async function forget(env: Env, req: string): Promise<void> {
  await Promise.all([
    env.OAUTH_KV.delete(`${PENDING}${req}`),
    env.OAUTH_KV.delete(`${SEALED}${req}`),
  ]);
}

// ---- What numinia.com may ask ---------------------------------------------

/** The answer to `ask`: what the relay told the consent page, or no such request. */
export type AskAnswer =
  { readonly ok: true; readonly app: string; readonly host: string } | { readonly ok: false };

/**
 * Whether the relay is waiting for `req`, and with which app and host: the
 * store refuses a consent whose page shows another name or host than the
 * relay sent (a link edited to say «Claude» while it returns elsewhere).
 */
export async function askRequest(env: Env, req: unknown): Promise<AskAnswer> {
  if (typeof req !== 'string' || !REQUEST_ID.test(req)) return { ok: false };
  const pending = await readPending(env, req);
  return pending === null ? { ok: false } : { ok: true, app: pending.app, host: pending.host };
}

/** What the store hands over: the connection the person allowed and its token. */
export const handOffShape = z.object({
  req: z.string().regex(REQUEST_ID),
  accountId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  agentId: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/),
  via: z.string().min(1).max(260),
  hear: z.boolean(),
  token: z.string().regex(/^ntk_[A-Za-z0-9_-]{43}$/),
});
export type HandOff = z.infer<typeof handOffShape>;

/** The answer to `keep`: where the browser goes next, or no. */
export type KeepAnswer = { readonly ok: true; readonly next: string } | { readonly ok: false };

/** Where numinia.com sends the browser once the token is sealed. */
export const vueltaUrl = (req: string): string => `${ORIGIN}${VUELTA_PATH}?req=${req}`;

/**
 * Seal the token for the request's browser and answer `/vuelta`'s address.
 * Refused (and nothing kept): a malformed hand-off, a request that is not
 * waiting, one already handed over, or a `via` that is not the host the
 * relay sent.
 */
export async function keepHandOff(env: Env, input: unknown): Promise<KeepAnswer> {
  const parsed = handOffShape.safeParse(input);
  if (!parsed.success) return { ok: false };
  const handOff = parsed.data;
  const pending = await readPending(env, handOff.req);
  if (pending === null || handOff.via !== `mcp:${pending.host}`) return { ok: false };
  if ((await readSealed(env, handOff.req)) !== null) return { ok: false };
  const sealed = await seal(pending.publicKey, JSON.stringify(handOff), handOff.req);
  await env.OAUTH_KV.put(`${SEALED}${handOff.req}`, JSON.stringify(sealed), {
    // KV keeps nothing for less than a minute; the request's own time rules anyway.
    expirationTtl: Math.max(60, pending.expiresAt - nowSeconds()),
  });
  return { ok: true, next: vueltaUrl(handOff.req) };
}

/**
 * The RPC entrypoint numinia.com's Worker is bound to (`MCP_HANDOFF`,
 * entrypoint `HandOffDesk`). Every argument is untrusted and re-checked.
 */
export class HandOffDesk extends WorkerEntrypoint<Env> {
  ask(req: unknown): Promise<AskAnswer> {
    return askRequest(this.env, req);
  }

  keep(handOff: unknown): Promise<KeepAnswer> {
    return keepHandOff(this.env, handOff);
  }
}
