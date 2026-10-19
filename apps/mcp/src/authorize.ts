/**
 * Everything the OAuth library does not answer itself: the interactive
 * authorization endpoint and the 404 for the rest. Story W6 replaces the
 * stub with the hand-off to numinia.com's consent page (`/conectar-ia`).
 */
import { AUTHORIZE_PATH } from './config';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

/** The non-API side of the relay (the library's `defaultHandler`). */
export function handleDefault(request: Request): Response {
  const { pathname } = new URL(request.url);
  if (pathname === AUTHORIZE_PATH) {
    return Response.json(
      {
        error: 'temporarily_unavailable',
        error_description:
          'Connecting an AI through numinia.com is not open yet: the sign-in and consent step is still being built. Use an organization AI access token in the meantime (Panel > Agents).',
      },
      { status: 501, headers: NO_STORE },
    );
  }
  return Response.json({ error: 'not_found' }, { status: 404, headers: NO_STORE });
}
