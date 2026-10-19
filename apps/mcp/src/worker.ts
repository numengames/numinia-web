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
 * {@link HandOffDesk}, this Worker's named RPC entrypoint.
 */
import {
  GrantType,
  OAuthError,
  OAuthProvider,
  type OAuthProviderOptions,
  type TokenExchangeCallbackOptions,
  type TokenExchangeCallbackResult,
} from '@cloudflare/workers-oauth-provider';
import { handleDefault } from './authorize';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTHORIZE_PATH,
  CLIENT_REGISTRATION_TTL_SECONDS,
  CONNECTION_MAX_SECONDS,
  MCP_PATH,
  ORIGIN,
  REFRESH_TOKEN_IDLE_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  REGISTER_PATH,
  RESOURCE,
  SCOPE_OFFLINE,
  SCOPE_WORLDS,
  TOKEN_PATH,
} from './config';
import type { Env } from './env';
import { handleMcp } from './mcp';
import type { GrantProps } from './vuelta';

export type { Env } from './env';
export { HandOffDesk } from './handoff';

/** KV keeps nothing for less than a minute; neither does the library. */
const SHORTEST_SECONDS = 60;

/**
 * At each refresh: the next 30 idle days, cut so the connection never
 * outlives 90 days from the consent (`connectedAt` in the grant's props).
 * Past that, or a grant without the date, is `invalid_grant`, and the
 * library revokes the grant: the client asks the person again.
 */
export function capRefresh(
  options: Pick<TokenExchangeCallbackOptions, 'grantType' | 'props'>,
): TokenExchangeCallbackResult | undefined {
  if (options.grantType !== GrantType.REFRESH_TOKEN) return undefined;
  const connectedAt = (options.props as Partial<GrantProps> | null)?.connectedAt;
  const left =
    typeof connectedAt === 'number'
      ? connectedAt + CONNECTION_MAX_SECONDS - Math.floor(Date.now() / 1000)
      : 0;
  if (left < SHORTEST_SECONDS) {
    throw new OAuthError('invalid_grant', {
      description: 'This connection is over 90 days old: connect the AI again.',
    });
  }
  return { refreshTokenIdleTTL: Math.min(REFRESH_TOKEN_IDLE_TTL_SECONDS, left) };
}

/** The provider's whole configuration; exported so the tests read what is deployed. */
export const PROVIDER_OPTIONS = {
  apiRoute: MCP_PATH,
  apiHandler: {
    fetch: (request: Request, env: Env, ctx: ExecutionContext) => handleMcp(request, env, ctx),
  },
  defaultHandler: { fetch: (request: Request, env: Env) => handleDefault(request, env) },
  authorizeEndpoint: AUTHORIZE_PATH,
  tokenEndpoint: TOKEN_PATH,
  clientRegistrationEndpoint: REGISTER_PATH,
  accessTokenTTL: ACCESS_TOKEN_TTL_SECONDS,
  refreshTokenTTL: REFRESH_TOKEN_TTL_SECONDS,
  refreshTokenIdleTTL: REFRESH_TOKEN_IDLE_TTL_SECONDS,
  tokenExchangeCallback: capRefresh,
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
