/**
 * The OAuth provider's whole configuration (story W5), apart from the
 * Worker's entry so that whoever needs the library's helpers outside a
 * request — the Durable Object `Cuerpo`, which revokes a grant when
 * numinia.com stops accepting the AI's token (story W8) — builds them from
 * the same options the Worker serves: `getOAuthApi(PROVIDER_OPTIONS, env)`.
 *
 * What the library publishes from these options is in worker.ts.
 */
import {
  GrantType,
  OAuthError,
  type OAuthProviderOptions,
  type TokenExchangeCallbackOptions,
  type TokenExchangeCallbackResult,
} from '@cloudflare/workers-oauth-provider';
import { handleDefault } from './authorize';
import { resolveStaticBearer } from './bearer';
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
  // A panel token pasted as a static bearer, for clients without OAuth (story W11, bearer.ts).
  resolveExternalToken: resolveStaticBearer,
  resourceMetadata: {
    resource: RESOURCE,
    authorization_servers: [ORIGIN],
    bearer_methods_supported: ['header'],
    resource_name: 'Numinia',
  },
} satisfies OAuthProviderOptions<Env>;
