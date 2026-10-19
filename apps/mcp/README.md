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

## What it answers (stories W5–W9)

| path                                            | answer                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /mcp` without a valid token               | `401`, `WWW-Authenticate: Bearer realm="OAuth", resource_metadata="https://mcp.numinia.com/.well-known/oauth-protected-resource/mcp", scope="mundos"`                                                                                                                                                                                                                                                                              |
| `POST /mcp` with a token                        | JSON-RPC: `initialize` (earlier protocol revisions), `ping`, `tools/list`, `tools/call` (the tools below; an unknown tool or no name `-32602`); anything else `-32601`. `initialize` carries `instructions`: how to get a body, then the bridge's own `INSTRUCCIONES` (without `oir`)                                                                                                                                              |
| `GET /.well-known/oauth-protected-resource/mcp` | RFC 9728: `resource` = `https://mcp.numinia.com/mcp` exactly, `authorization_servers` = `["https://mcp.numinia.com"]`, `scopes_supported` = `["mundos"]`                                                                                                                                                                                                                                                                           |
| `GET /.well-known/oauth-authorization-server`   | RFC 8414: PKCE `S256` only, `none` among the token endpoint auth methods, `client_id_metadata_document_supported: true`, `registration_endpoint`, scopes `mundos` and `offline_access`                                                                                                                                                                                                                                             |
| `POST /register`                                | dynamic client registration (RFC 7591), the fallback for clients without CIMD; a client is kept 90 days                                                                                                                                                                                                                                                                                                                            |
| `POST /token`                                   | authorization code (PKCE) and refresh grants, and revocation (RFC 7009)                                                                                                                                                                                                                                                                                                                                                            |
| `GET /authorize`                                | the library validates the request (client, exact redirect URI, S256, `resource`); `302` to `<STORE_ORIGIN>[/<locale>]/conectar-ia/?app=&host=&req=` (`app`: the client's name; an id or name that is a URL, by its host) with the request's own cookie `__Host-vuelta-<req>` (HttpOnly, Secure, Lax, 10 min). An error the library may send back goes `302` to the client; any other, a plain page `400`; no `STORE_ORIGIN`, `503` |
| `GET /vuelta?req=`                              | once per request: cookie, sealed hand-off, `GET /api/agents/me` on numinia.com with the token as Bearer, then `302` to the client with the code. Any «no» is a plain page and no code (`400`; numinia.com down `502`; not configured `503`)                                                                                                                                                                                        |
| anything else                                   | `404`                                                                                                                                                                                                                                                                                                                                                                                                                              |

Lifetimes, set by hand in `src/config.ts`: access token 1 hour; refresh
token 30 days from its last use (the code exchange, then each refresh:
`refreshTokenIdleTTL`), never past 90 days from the consent (`capRefresh`,
`invalid_grant` after that), rotated on every use (the previous one stays
valid until the new one is first used).

## The tools (story W7)

Both without state and without input (`{}`): each call reads the grant's
props (organization, agent, the AI's `ntk_` token) and asks numinia.com's
`GET /api/agents/me` (`src/me.ts`, the same call `/vuelta` makes), so a
switch flipped in Panel › Agents shows on the next call. Each answers
`structuredContent` (with its `outputSchema`) and the same JSON as text.

| tool        | answers                                                                                                                                                                                                                                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quien_soy` | `id` (stable: `<organization>.<agent>`, the same across calls and reconnections), `agent`, `organization`, `name`, `enabled`, `state` (`activa`/`dormida`), `standing` (the panel's `apagada`, `sin-responsable`, `sin-permiso`, `activa`, `dormida`), `canEnter`, `permissions`, `hear: false` (no `oir` for URL-connected AIs yet), `note` |
| `mundos`    | `organization`, `worlds: [{ id, name?, on, enter: { tool: "entrar", arguments: { mundo } } }]` (the worlds `/me` lists, which are the ones the fleet serves), `note`; `worlds: []` with `reason` (`apagada`, `sin-responsable`, `sin-permiso`, `sin-mundos`) when there is none to enter                                                     |

What goes wrong is a tool result with `isError: true` and a sentence the AI
can act on, never a protocol error: numinia.com unreachable or `5xx`, busy
(`429`), an answer off the contract, the relay without `STORE_ORIGIN`. A
`401` from numinia.com (the token revoked or renewed) revokes this grant with
the library's `unwrapToken` + `revokeGrant` — only this one; a newer grant of
the same AI keeps working — and the tool says to connect again: the
client's next call is a `401` and its refresh is `invalid_grant`.

## The body's tools (story W9)

`tools/list` shows, after `quien_soy` and `mundos`:

| tool               | does                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| `entrar` `{mundo}` | takes the AI's body into one of its organization's worlds (an id from `mundos`); answers `{world, state, note}` |
| `salir` `{}`       | takes it out and frees the organization's seat; answers `{left, world, seconds, note}`                          |
| `mirar`            | where the body is, people and objects within 40 m, whether it may build, the models it may place                |
| `decir`            | says something in the world's chat (near or the zone)                                                           |
| `ir_a`             | walks to a point (or follows someone)                                                                           |
| `colocar`          | places a model of the house's library (`vendor/biblioteca.json`)                                                |
| `mover`            | moves, turns or scales an object by its id                                                                      |
| `borrar`           | removes an object by its id                                                                                     |
| `deshacer`         | undoes the AI's last change                                                                                     |

The last seven are the bridge's own: listed with its names, descriptions
and schemas (`PuenteMundo.herramientas()`, without `oir` while
`URL_AIS_HEAR` is off), run by the bridge's own `ServidorMcp` inside the
AI's `Cuerpo` through `usar()`, and answered with its own text, so what
people in the world wrote stays inside its `<material fiable="no">` block.
The Worker keeps nothing (`src/herramientas-cuerpo.ts`): it checks the
arguments it reads (`entrar` takes exactly `{mundo}`, `salir` none, a world
tool at most 4 KB of JSON), finds the grant to revoke (`unwrapToken`) and
calls the body `<organization>.<agent>`. Each refusal is an `isError`
result the AI can act on: a world tool before `entrar` («enter one first
with entrar»), a fourth body in the organization, what the pass or the
world forbids (asleep, no building there, a build refused — the bridge's or
the world's own sentence), the world not answering, numinia.com down, the
token revoked (the grant goes too).

## The AI's body in a world (story W8)

Two Durable Objects, reached from MCP through the body's tools above:

- **`Cuerpo`** (`src/cuerpo.ts`), one per AI, named `<organization>.<agent>`
  (`bodyOf(env, org, agent)`). `entrar({props, mundo, grant?})` asks `/me`,
  takes a seat, asks numinia.com for a 10-minute H3b pass with the AI's token
  (`POST /api/agents/pass`, Bearer) and opens the outbound WebSocket to the
  world's `ws` by running the engine's bridge, vendored as
  `vendor/puente-mundo.mjs` (`vendor/VENDOR.md`: commit, hash, refresh). The
  bridge renews the pass every 8 minutes on the same connection. `salir()`
  leaves; `usar({props, grant?, tool?})` is what each world tool calls (it
  keeps the body from idling out, hands it the newest token and runs the
  tool, outside the object's queue); `estado()` says
  where it is and why it last left. One body per AI, in one world at a time:
  `entrar` another world leaves the first.
- **`Plazas`** (`src/plazas.ts`), one per organization: at most **3** bodies
  inside at once (a seat is a 3-minute lease the body renews every minute,
  so a vanished body frees it by itself), and the **body time**, counted per
  UTC day and per agent in its own storage (`days()`), to bill later; the
  house pays it for now.

While inside, the body's alarm rings every minute: it adds the minute to
the organization's body time, renews its seat, asks `/me` (never more than
once a minute) and leaves after 10 minutes without calls, when switched off,
without anyone answering for it or the permission, when its world is gone
from `/me`, when the world puts it out (4003) or its seat lapsed. A `401`
from numinia.com (on `/me` or a pass) leaves and revokes the grant the body
came with. Asleep (`dormida`) it stays, and the bridge keeps to what its pass
allows. Leaving stops every timer (the bridge's 20 Hz clock, which keeps the
object awake while inside, its pass renewal and the alarm), so the object
can be evicted. The token is only in memory: never in storage, a note or an
answer. `oir` stays off (`URL_AIS_HEAR = false`): `worldTools()` leaves it
out and what the bridge hears is dropped every minute.

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
npm test --workspace @numinia/mcp      # vitest in Node: KV, Durable Objects and a world in memory
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
