/**
 * Everything the OAuth library does not answer itself (its
 * `defaultHandler`): the interactive authorization endpoint, which sends the
 * browser to numinia.com's consent page (story W6), the way back from it
 * (`/vuelta`, vuelta.ts), and the 404 for the rest.
 *
 * `/authorize`:
 * 1. the library parses and validates the request (client, exact redirect
 *    URI, PKCE S256, `resource`); an error it may send back to the client
 *    goes back to the client, any other is the plain page;
 * 2. the library's `describeConsent` names the client as its metadata does
 *    (CIMD document or DCR registration) and the host the code goes to;
 * 3. it keeps the parsed request 10 minutes in KV under a fresh one-time
 *    id (`req`), with the public half of a fresh key pair; the private half
 *    goes in the request's own cookie (`__Host-vuelta-<req>`, HttpOnly,
 *    10 minutes), which binds the flow to this browser (seal.ts);
 * 4. it sends the browser to `<STORE_ORIGIN>[/<locale>]/conectar-ia/?app=&host=&req=`,
 *    the locale picked from `Accept-Language` among the site's five.
 * No setting, no library helpers: the plain «not now» page (503).
 */
import {
  AuthorizationError,
  type AuthRequest,
  type ConsentDescription,
} from '@cloudflare/workers-oauth-provider';
import { AUTHORIZE_PATH, REQUEST_TTL_SECONDS, VUELTA_PATH } from './config';
import { storeOrigin, type Env } from './env';
import { newRequestId, requestCookie, savePending } from './handoff';
import { consentPath, localeOf, redirect, stopPage } from './pages';
import { newSealKeys, sha256 } from './seal';
import { handleVuelta } from './vuelta';

/** The consent page shows the first 40 characters of a client's name (store: `readClient`). */
const APP_NAME_MAX = 40;

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** GET /authorize: validate, keep the request, and send the browser to the consent. */
export async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  const store = storeOrigin(env);
  const helpers = env.OAUTH_PROVIDER;
  if (store === null || helpers === undefined) return stopPage(request, 'unavailable', 503);

  let authRequest: AuthRequest;
  try {
    authRequest = await helpers.parseAuthRequest(request);
  } catch (error) {
    // Only an error the library says is safe to send back goes to the client.
    if (error instanceof AuthorizationError && error.redirectTo !== undefined) {
      return redirect(error.redirectTo);
    }
    return stopPage(request, 'bad', 400);
  }
  // What the library says a consent page must show: the client's name as
  // its CIMD document or registration gives it (its id when it gives none)
  // and the host the code will be sent to.
  let consent: ConsentDescription;
  try {
    consent = await helpers.describeConsent(authRequest);
  } catch {
    return stopPage(request, 'bad', 400);
  }
  const host = consent.redirectHost.toLowerCase();
  const app = [...consent.clientName.trim()].slice(0, APP_NAME_MAX).join('');
  const req = newRequestId();
  const keys = await newSealKeys();
  await savePending(env, req, {
    authRequest,
    app,
    host,
    publicKey: keys.publicKey,
    cookieHash: await sha256(keys.privateKey),
    expiresAt: Math.floor(Date.now() / 1000) + REQUEST_TTL_SECONDS,
  });
  const page = new URL(`${store}${consentPath(localeOf(request.headers.get('Accept-Language')))}`);
  page.search = new URLSearchParams({ app, host, req }).toString();
  return redirect(page.href, { 'Set-Cookie': requestCookie(req, keys.privateKey) });
}

/** The non-API side of the relay (the library's `defaultHandler`). */
export async function handleDefault(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === AUTHORIZE_PATH) return handleAuthorize(request, env);
  if (pathname === VUELTA_PATH) return handleVuelta(request, env);
  return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
}
