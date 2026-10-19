/**
 * The relay's OAuth facts, in one place (DISENO-MCP-REMOTO §2 (e)). Every
 * value here is published in a discovery document or bound into a token, so
 * a change is a change of contract with every connected client.
 */

/** The relay's one public origin: OAuth issuer and MCP host at once. */
export const ORIGIN = 'https://mcp.numinia.com';

/**
 * The MCP endpoint's canonical URL, the RFC 9728 `resource` and the RFC 8707
 * audience of every token. Claude requires it to equal, byte for byte, the
 * URL a person pastes.
 */
export const RESOURCE = `${ORIGIN}/mcp`;

/** Where the MCP endpoint answers (the path of {@link RESOURCE}). */
export const MCP_PATH = '/mcp';

/** The interactive authorization endpoint: it sends the browser to numinia.com's consent. */
export const AUTHORIZE_PATH = '/authorize';

/** The token endpoint, which also answers revocation (RFC 7009). */
export const TOKEN_PATH = '/token';

/**
 * Where numinia.com sends the browser back once the person allowed the AI
 * (`/vuelta?req=…`): the relay takes the sealed token and issues the code.
 */
export const VUELTA_PATH = '/vuelta';

/** How long a request waits for its consent, and its cookie lives: 10 minutes. */
export const REQUEST_TTL_SECONDS = 10 * 60;

/** numinia.com's consent page, without its locale prefix (store: lib/conectar-ia-page.ts). */
export const CONSENT_PATH = '/conectar-ia/';

/** The site's five locales; English is the default and has no prefix. */
export const LOCALES = ['en', 'es', 'ja', 'ko', 'pt-br'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Dynamic client registration (RFC 7591), the fallback when CIMD is not used. */
export const REGISTER_PATH = '/register';

/**
 * The one permission: act in the worlds of the organization the grant is
 * bound to. What the AI may do there is decided by its organization roles,
 * not by OAuth scopes.
 */
export const SCOPE_WORLDS = 'mundos';

/** Asked for by clients that want a refresh token (ChatGPT needs it advertised). */
export const SCOPE_OFFLINE = 'offline_access';

/** An access token lives one hour. */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

/**
 * A refresh token is good for 30 days counted from its last use: the code
 * exchange starts the count and every refresh starts it again (the
 * library's `refreshTokenIdleTTL`), so an AI that keeps working stays
 * connected and one left idle for 30 days has to connect again. Each use
 * rotates it; the library keeps the previous one valid until the new one is
 * first used.
 */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** The sliding window of {@link REFRESH_TOKEN_TTL_SECONDS}, restarted by each refresh. */
export const REFRESH_TOKEN_IDLE_TTL_SECONDS = REFRESH_TOKEN_TTL_SECONDS;

/**
 * However often it is refreshed, a connection ends 90 days after the person
 * allowed it on numinia.com: then they connect again (and see the consent
 * again). Enforced at each refresh by the relay's token exchange callback.
 */
export const CONNECTION_MAX_SECONDS = 90 * 24 * 60 * 60;

/** A dynamically registered client is forgotten after 90 days. */
export const CLIENT_REGISTRATION_TTL_SECONDS = 90 * 24 * 60 * 60;
