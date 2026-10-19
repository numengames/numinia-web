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

## What it answers (story W5)

| path | answer |
|---|---|
| `POST /mcp` without a valid token | `401`, `WWW-Authenticate: Bearer realm="OAuth", resource_metadata="https://mcp.numinia.com/.well-known/oauth-protected-resource/mcp", scope="mundos"` |
| `POST /mcp` with a token | JSON-RPC: `initialize` (earlier protocol revisions), `ping`, `tools/list` → no tools yet; anything else `-32601` |
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728: `resource` = `https://mcp.numinia.com/mcp` exactly, `authorization_servers` = `["https://mcp.numinia.com"]`, `scopes_supported` = `["mundos"]` |
| `GET /.well-known/oauth-authorization-server` | RFC 8414: PKCE `S256` only, `none` among the token endpoint auth methods, `client_id_metadata_document_supported: true`, `registration_endpoint`, scopes `mundos` and `offline_access` |
| `POST /register` | dynamic client registration (RFC 7591), the fallback for clients without CIMD; a client is kept 90 days |
| `POST /token` | authorization code (PKCE) and refresh grants, and revocation (RFC 7009) |
| `GET /authorize` | `501` until story W6 (the hand-off to numinia.com's consent page) |
| anything else | `404` |

Lifetimes, set by hand in `src/config.ts`: access token 1 hour; refresh
token 30 days from the code exchange, rotated on every use (the previous
one stays valid until the new one is first used).

## Local runs and tests

```bash
npm test --workspace @numinia/mcp      # vitest in Node, KV in memory
npm run build --workspace @numinia/mcp # wrangler dry run into dist/
```

## Deploy — the house, not a story

Nothing deploys this Worker on push. Before the first `npm run deploy`:

1. Create the KV namespace (`wrangler kv namespace create numinia-mcp-oauth`)
   and put its id in `wrangler.jsonc` in place of the placeholder.
2. The deploy itself creates the custom domain `mcp.numinia.com` (route
   with `custom_domain: true`); `numinia.com` must be a zone of the account.
