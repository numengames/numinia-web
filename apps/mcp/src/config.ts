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

/** The interactive authorization endpoint (story W6; a stub until then). */
export const AUTHORIZE_PATH = '/authorize';

/** The token endpoint, which also answers revocation (RFC 7009). */
export const TOKEN_PATH = '/token';

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
 * A grant's refresh token lives 30 days from the code exchange, a fixed
 * lifetime (no idle extension): after that the person connects again. Each
 * use rotates it; the library keeps the previous one valid until the new
 * one is first used.
 */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** A dynamically registered client is forgotten after 90 days. */
export const CLIENT_REGISTRATION_TTL_SECONDS = 90 * 24 * 60 * 60;
