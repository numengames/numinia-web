/**
 * The relay's Worker (DISENO-MCP-REMOTO §2 (a), story W5): Numinia's remote
 * MCP server at https://mcp.numinia.com/mcp and the OAuth 2.1 authorization
 * server that issues its tokens, in one Worker, with Cloudflare's
 * `@cloudflare/workers-oauth-provider` (MIT) doing the protocol.
 *
 * What the library publishes from these options:
 * - `/.well-known/oauth-protected-resource/mcp` (RFC 9728): `resource` is
 *   exactly {@link RESOURCE}, the one authorization server is {@link ORIGIN}.
 * - `/.well-known/oauth-authorization-server` (RFC 8414): PKCE `S256` only,
 *   public clients (`none`), CIMD when the runtime has
 *   `global_fetch_strictly_public`, DCR at `/register` as the fallback, and
 *   the scopes `mundos` and `offline_access`.
 * - `/mcp` without a valid token: `401` with
 *   `WWW-Authenticate: Bearer … resource_metadata="…"`.
 * - `/token`: code and refresh grants (refresh rotated, 30 days from its
 *   last use, never past 90 days from the connection), revocation.
 * Everything else goes to {@link handleDefault}: `/authorize` sends the
 * browser to numinia.com's consent and `/vuelta` brings it back with a code
 * (story W6). numinia.com hands the AI's token over through
 * {@link HandOffDesk}, this Worker's named RPC entrypoint. The options
 * themselves live in provider.ts; the AI's body in a world is the Durable
 * Object `Cuerpo` (cuerpo.ts), its organization's seats `Plazas` (plazas.ts).
 * Before any of it, `/register` and `/authorize` are counted per address
 * (limites.ts, story W10).
 */
import { OAuthProvider } from '@cloudflare/workers-oauth-provider';
import type { Env } from './env';
import { overLimit } from './limites';
import { PROVIDER_OPTIONS } from './provider';

export type { Env } from './env';
export { HandOffDesk } from './handoff';
export { capRefresh, PROVIDER_OPTIONS } from './provider';
// The Durable Objects (story W8): one body per AI, one seat desk per organization.
export { Cuerpo } from './cuerpo';
export { Plazas } from './plazas';

const provider = new OAuthProvider<Env>(PROVIDER_OPTIONS);

const worker = {
  // `/register` and `/authorize` are counted per address first (story W10, limites.ts).
  fetch: async (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> =>
    (await overLimit(request, env)) ?? provider.fetch(request, env, ctx),
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line no-restricted-syntax -- the Workers runtime calls the module's default export
export default worker;
