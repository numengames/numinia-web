# The relay — `apps/mcp`

Paso 2 of the organization's AI («pega una URL y entra con numinia.com»,
design `DISENO-MCP-REMOTO`): Numinia's remote MCP server and the OAuth 2.1
authorization server that issues its tokens, one Cloudflare Worker of its
own (`numinia-mcp`) at `https://mcp.numinia.com`. A person pastes
`https://mcp.numinia.com/mcp` into Claude, ChatGPT or Hermes; the client
discovers the rest. Sign-in and consent happen on numinia.com
(`/conectar-ia`), so the person sees the site they already know.

The OAuth protocol is Cloudflare's `@cloudflare/workers-oauth-provider`
(MIT, pinned at 1.2.3): it stores tokens and codes only as hashes and
encrypts each grant's props with a key only the token holder can unwrap.

## What it answers (stories W5, W6)

| path | answer |
|---|---|
| `POST /mcp` without a valid token | `401`, `WWW-Authenticate: Bearer realm="OAuth", resource_metadata="https://mcp.numinia.com/.well-known/oauth-protected-resource/mcp", scope="mundos"` |
| `POST /mcp` with a token | JSON-RPC: `initialize` (earlier protocol revisions), `ping`, `tools/list` → no tools yet; anything else `-32601` |
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728: `resource` = `https://mcp.numinia.com/mcp` exactly, `authorization_servers` = `["https://mcp.numinia.com"]`, `scopes_supported` = `["mundos"]` |
| `GET /.well-known/oauth-authorization-server` | RFC 8414: PKCE `S256` only, `none` among the token endpoint auth methods, `client_id_metadata_document_supported: true`, `registration_endpoint`, scopes `mundos` and `offline_access` |
| `POST /register` | dynamic client registration (RFC 7591), the fallback for clients without CIMD; a client is kept 90 days |
| `POST /token` | authorization code (PKCE) and refresh grants, and revocation (RFC 7009) |
| `GET /authorize` | the library validates the request (client, exact redirect URI, S256, `resource`); `302` to `<STORE_ORIGIN>[/<locale>]/conectar-ia/?app=&host=&req=` with the request's own cookie `__Host-vuelta-<req>` (HttpOnly, Secure, Lax, 10 min). An error the library may send back goes `302` to the client; any other, a plain page `400`; no `STORE_ORIGIN`, `503` |
| `GET /vuelta?req=` | once per request: cookie, sealed hand-off, `GET /api/agents/me` on numinia.com with the token as Bearer, then `302` to the client with the code. Any «no» is a plain page and no code (`400`; numinia.com down `502`; not configured `503`) |
| anything else | `404` |

Lifetimes, set by hand in `src/config.ts`: access token 1 hour; refresh
token 30 days from its last use (the code exchange, then each refresh:
`refreshTokenIdleTTL`), never past 90 days from the consent (`capRefresh`,
`invalid_grant` after that), rotated on every use (the previous one stays
valid until the new one is first used).

## The hand-off with numinia.com (story W6)

numinia.com mints the AI's `ntk_` token when the person presses «Conectar»
and must give it to the relay without the browser ever carrying it. It
calls this Worker's named RPC entrypoint `HandOffDesk` through a service
binding (`MCP_HANDOFF` in the root `wrangler.jsonc`): `ask(req)` before
making the AI (is the relay waiting for this request, with the app and
host the page showed?) and `keep({req, accountId, agentId, via, hear,
token})` after; `keep` answers `next`, this relay's `/vuelta?req=…`.

The relay seals the token the moment it arrives (`src/seal.ts`):
`/authorize` made a P-256 key pair for the request, kept the public half in
KV and gave the private half only to the browser, in the request's cookie.
The sealed blob (ECDH with a one-time key, HKDF-SHA-256, AES-GCM bound to
`req`) waits in KV at most until the request's 10 minutes end. So the token
is never in a URL or the browser, never in clear in KV, and only the
browser that started the request can open it at `/vuelta`; there it goes
into the grant's props, which the library encrypts. The relay writes no
log lines.

## Local runs and tests

```bash
npm test --workspace @numinia/mcp      # vitest in Node, KV in memory
npm run build --workspace @numinia/mcp # wrangler dry run into dist/
```

## Deploy — the house, not a story

Nothing deploys this Worker on push. Before the first `npm run deploy`:

1. Create the KV namespace (`wrangler kv namespace create numinia-mcp-oauth`)
   and put its id in `wrangler.jsonc` in place of the placeholder.
2. Deploy this Worker BEFORE numinia.com's next deploy: numinia.com's
   `MCP_HANDOFF` service binding points at its `HandOffDesk` entrypoint.
   `STORE_ORIGIN` is a var in `wrangler.jsonc` (no secret to set).
3. The deploy itself creates the custom domain `mcp.numinia.com` (route
   with `custom_domain: true`); `numinia.com` must be a zone of the account.
