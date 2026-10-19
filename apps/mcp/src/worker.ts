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
 * - `/token`: code and refresh grants (refresh rotated), revocation.
 * Everything else goes to {@link handleDefault}; `/authorize` is a stub
 * until story W6.
 */
import {
  OAuthProvider,
  type OAuthHelpers,
  type OAuthProviderOptions,
} from '@cloudflare/workers-oauth-provider';
import { handleDefault } from './authorize';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZE_PATH,
  CLIENT_REGISTRATION_TTL_SECONDS,
  MCP_PATH,
  ORIGIN,
  REFRESH_TOKEN_TTL_SECONDS,
  REGISTER_PATH,
  RESOURCE,
  SCOPE_OFFLINE,
  SCOPE_WORLDS,
  TOKEN_PATH,
} from './config';
import { handleMcp } from './mcp';

/** The relay's bindings. `OAUTH_PROVIDER` is set by the library for the default handler. */
export interface Env {
  OAUTH_KV: KVNamespace;
  OAUTH_PROVIDER?: OAuthHelpers;
}

/** The provider's whole configuration; exported so the tests read what is deployed. */
export const PROVIDER_OPTIONS = {
  apiRoute: MCP_PATH,
  apiHandler: { fetch: (request: Request) => handleMcp(request) },
  defaultHandler: { fetch: (request: Request) => handleDefault(request) },
  authorizeEndpoint: AUTHORIZE_PATH,
  tokenEndpoint: TOKEN_PATH,
  clientRegistrationEndpoint: REGISTER_PATH,
  accessTokenTTL: ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenTTL: REFRESH_TOKEN_TTL_SECONDS,
  clientRegistrationTTL: CLIENT_REGISTRATION_TTL_SECONDS,
  // Public clients (no secret, PKCE instead) may register: Claude, ChatGPT
  // and Hermes are all public clients.
  disallowPublicClientRegistration: false,
  clientIdMetadataDocumentEnabled: true,
  allowTokenExchangeGrant: false,
  scopesSupported: [SCOPE_WORLDS, SCOPE_OFFLINE],
  requiredScopes: [SCOPE_WORLDS],
  resourceMetadata: {
    resource: RESOURCE,
    authorization_servers: [ORIGIN],
    bearer_methods_supported: ['header'],
    resource_name: 'Numinia',
  },
} satisfies OAuthProviderOptions<Env>;

const provider = new OAuthProvider<Env>(PROVIDER_OPTIONS);

const worker = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext): Promise<Response> =>
    provider.fetch(request, env, ctx),
} satisfies ExportedHandler<Env>;

// eslint-disable-next-line no-restricted-syntax -- the Workers runtime calls the module's default export
export default worker;
