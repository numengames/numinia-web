/**
 * `/vuelta?req=…` (story W6): the way back from numinia.com's consent to
 * the client, and the only place the relay issues an authorization code.
 *
 * Each request is used once: whatever happens, the waiting request and its
 * sealed hand-off are deleted before anything else is checked. Then, in
 * order — any «no» is the plain page and no code:
 * 1. the request was waiting, numinia.com handed its token over, and this
 *    browser brings the request's own cookie (set by `/authorize`; its hash
 *    is kept with the request);
 * 2. the cookie's private key opens the sealed hand-off (seal.ts), made for
 *    this very request;
 * 3. numinia.com's `GET /api/agents/me` (W1, asked by me.ts) says the token is that
 *    agent's, in that organization — a hash the till does not know is a no;
 * 4. the library completes the authorization: a grant for the agent with
 *    scope `mundos` (+ `offline_access` if asked), whose props carry the
 *    token, which the library encrypts with a key only the client's tokens
 *    unwrap. The browser goes back to the client with the code.
 * The token is never written in a URL, a page, a header to the browser or a
 * log line; it leaves the relay only as the Bearer of the `me` check.
 */
import { SCOPE_OFFLINE, SCOPE_WORLDS } from './config';
import { storeFetch, storeOrigin, type Env, type StoreFetch } from './env';
import {
  REQUEST_ID,
  cookieName,
  forget,
  handOffShape,
  readPending,
  readSealed,
  requestCookie,
  type HandOff,
} from './handoff';
import { askMe } from './me';
import { redirect, stopPage } from './pages';
import { open, sha256 } from './seal';

/** What a grant carries, encrypted by the library (DISENO-MCP-REMOTO §2 (b)). */
export interface GrantProps {
  readonly accountId: string;
  readonly agentId: string;
  /** The AI's `ntk_` token: the relay's credential before numinia.com. */
  readonly token: string;
  /** How it was connected (`mcp:<host>`), as the till's `connected_via`. */
  readonly via: string;
  /** Whether it may hear nearby chat: the house's switch, off for URL-connected AIs. */
  readonly hear: boolean;
  /** When the person allowed it, Unix seconds: the 90-day ceiling counts from here. */
  readonly connectedAt: number;
}

/** The grant's user: the agent in its organization (`:` is the library's separator). */
export const grantUserId = (accountId: string, agentId: string): string =>
  `${accountId}.${agentId}`;

/** The value of one cookie, or null. */
export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=') || null;
  }
  return null;
}

function readHandOff(text: string): HandOff | null {
  try {
    const parsed = handOffShape.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** What numinia.com says of the token: its agent's, not, or it did not answer. */
type TillSays = 'yes' | 'no' | 'down';

async function tillKnows(store: string, handOff: HandOff, send: StoreFetch): Promise<TillSays> {
  const answer = await askMe(store, handOff, send);
  if (answer.kind === 'down' || answer.kind === 'busy') return 'down';
  if (answer.kind !== 'ok') return 'no';
  return answer.me.org === handOff.accountId && answer.me.id === handOff.agentId ? 'yes' : 'no';
}

/** GET /vuelta?req=…: check everything, then issue the code. */
export async function handleVuelta(request: Request, env: Env): Promise<Response> {
  const req = new URL(request.url).searchParams.get('req') ?? '';
  if (!REQUEST_ID.test(req)) return stopPage(request, 'bad', 400);
  const clear = { 'Set-Cookie': requestCookie(req, null) };
  const bad = (): Response => stopPage(request, 'bad', 400, clear);

  const [pending, sealed] = await Promise.all([readPending(env, req), readSealed(env, req)]);
  await forget(env, req);
  if (pending === null || sealed === null) return bad();
  const cookie = readCookie(request.headers.get('Cookie'), cookieName(req));
  if (cookie === null || (await sha256(cookie)) !== pending.cookieHash) return bad();
  const opened = await open(cookie, sealed, req);
  const handOff = opened === null ? null : readHandOff(opened);
  if (handOff === null || handOff.req !== req) return bad();

  const store = storeOrigin(env);
  const helpers = env.OAUTH_PROVIDER;
  if (store === null || helpers === undefined) {
    return stopPage(request, 'unavailable', 503, clear);
  }
  const says = await tillKnows(store, handOff, storeFetch(env));
  if (says === 'down') return stopPage(request, 'unavailable', 502, clear);
  if (says === 'no') return bad();

  const props: GrantProps = {
    accountId: handOff.accountId,
    agentId: handOff.agentId,
    token: handOff.token,
    via: handOff.via,
    hear: handOff.hear,
    connectedAt: Math.floor(Date.now() / 1000),
  };
  const offline = pending.authRequest.scope.includes(SCOPE_OFFLINE);
  try {
    const { redirectTo } = await helpers.completeAuthorization({
      request: pending.authRequest,
      userId: grantUserId(handOff.accountId, handOff.agentId),
      // Kept in clear by the library: never the token.
      metadata: { app: pending.app, via: handOff.via },
      scope: offline ? [SCOPE_WORLDS, SCOPE_OFFLINE] : [SCOPE_WORLDS],
      props,
    });
    return redirect(redirectTo, clear);
  } catch {
    return stopPage(request, 'unavailable', 502, clear);
  }
}
