/**
 * The static bearer (DISENO-MCP-REMOTO §2 (b), story W11): a client that
 * cannot do OAuth — Hermes with `headers`, a script, Claude's static header
 * — pastes the relay's URL and the AI's `ntk_` token from Panel › Agents,
 * and calls `/mcp` with `Authorization: Bearer ntk_…`.
 *
 * The OAuth library finds no grant for such a token and hands it to
 * {@link resolveStaticBearer} (its `resolveExternalToken` hook). The relay
 * holds only the token, so it asks numinia.com whose it is with the token
 * alone (`GET /api/agents/me`, no query: the store finds the agent by the
 * token's hash, me.ts `askMeByToken`), and the request carries the same
 * props a grant would: `{ accountId, agentId, token, via, hear }` —
 * `via` is {@link STATIC_VIA}, the till's word for a token made in the
 * panel, and how the tools tell a pasted token from a grant. Everything
 * after that is the same: the same tools, the same body `Cuerpo` named
 * `<org>.<agent>`, the same per-agent meter on numinia.com.
 *
 * Nothing is cached: every request asks again, so a token revoked or
 * renewed in the panel is refused on the very next call. A refused token —
 * not shaped like one, unknown, revoked, renewed, of a key agent — is the
 * library's ordinary `401 invalid_token` with its `WWW-Authenticate`
 * challenge, the same answer whatever the reason. numinia.com busy is a
 * `429`, unreachable or not understood a `503`: neither says anything of
 * the token. Each address may have {@link BEARER_PER_MINUTE} tokens checked
 * a minute (limites.ts). There is no grant behind a pasted token, so there
 * is none to revoke when numinia.com stops accepting it: the tools say so
 * in words for whoever pasted it ({@link STATIC_REVOKED}).
 *
 * The token goes to numinia.com in the `Authorization` header only, never
 * in a URL, an error or a log line.
 */
import {
  ExternalTokenError,
  type ResolveExternalTokenInput,
} from '@cloudflare/workers-oauth-provider';
import { RESOURCE } from './config';
import { storeFetch, storeOrigin, type Env } from './env';
import { BEARER_PER_MINUTE, LIMIT_WINDOW_SECONDS, bearerAllowed } from './limites';
import { askMeByToken } from './me';
import type { GrantProps } from './vuelta';

/** How a pasted panel token says it was connected: the till's `connected_via` for the panel. */
export const STATIC_VIA = 'panel';

/** A panel token's shape (the store's `newToken`: `ntk_` and 32 random bytes in base64url). */
const PANEL_TOKEN = /^ntk_[A-Za-z0-9_-]{43}$/;

/** What a request with a pasted panel token carries: a grant's props, without its date. */
export type StaticProps = Omit<GrantProps, 'connectedAt'>;

/** What the tools tell an AI whose pasted token numinia.com no longer accepts. */
export const STATIC_REVOKED =
  'This token was revoked or renewed on numinia.com (Panel › Agents), and it no longer works. Whoever set this AI up copies its new token from Panel › Agents and puts it in the client’s Authorization header.';

/** Whether a request's props came from a pasted panel token rather than an OAuth grant. */
export function isStaticBearer(props: unknown): boolean {
  return (
    typeof props === 'object' &&
    props !== null &&
    (props as { readonly via?: unknown }).via === STATIC_VIA
  );
}

const wait = { 'Retry-After': String(LIMIT_WINDOW_SECONDS) };

const unavailable = (
  description: string,
  statusCode: number,
  headers: Record<string, string> = {},
) => new ExternalTokenError('temporarily_unavailable', { description, statusCode, headers });

/**
 * The library's `resolveExternalToken`: the props of the AI whose panel
 * token this is, or null (the library's `401`); a busy or absent
 * numinia.com throws an {@link ExternalTokenError} the library answers.
 */
export async function resolveStaticBearer({
  token,
  request,
  env,
}: ResolveExternalTokenInput<Env>): Promise<{ props: StaticProps; audience: string } | null> {
  if (!PANEL_TOKEN.test(token)) return null;
  if (!(await bearerAllowed(request, env))) {
    throw unavailable(
      `Too many tokens checked from this address: wait a minute (at most ${BEARER_PER_MINUTE} a minute).`,
      429,
      wait,
    );
  }
  const store = storeOrigin(env);
  if (store === null) {
    throw unavailable(
      'This server cannot reach numinia.com right now (it is not configured).',
      503,
    );
  }
  const answer = await askMeByToken(store, token, storeFetch(env));
  switch (answer.kind) {
    case 'ok':
      return {
        props: {
          accountId: answer.me.org,
          agentId: answer.me.id,
          token,
          via: STATIC_VIA,
          hear: answer.me.hear,
        },
        audience: RESOURCE,
      };
    case 'revoked':
      return null;
    case 'busy':
      throw unavailable(
        'Too many requests for this AI right now (numinia.com allows 60 a minute): wait a minute.',
        429,
        wait,
      );
    default:
      throw unavailable('numinia.com did not answer as expected: try again in a minute.', 503);
  }
}
