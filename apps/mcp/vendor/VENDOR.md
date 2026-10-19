# Vendored: the world bridge (`puente-mundo.mjs`)

`puente-mundo.mjs` is numinia-engine's world bridge (`PuenteMundo`, its
eight tools and the token way of asking numinia.com for a world pass),
bundled by the engine into one ES module with platform «neutral»: no
`node:` import and no import at all, so it runs inside the relay's Durable
Object `Cuerpo` (`src/cuerpo.ts`, story W8) in workerd.

|                |                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| upstream       | `numengames/numinia-engine`, `packages/agent/src/puente-neutral.ts`                                         |
| commit         | `240002dcc5e3d81c174939f3b6f6c16ce4e35c4b` (branch `agentes/puente-neutral`, story M1; engine 0.20.0)       |
| built with     | `npm run puente` in the engine (`tools/empaquetar-puente.mjs` → `dist/puente-mundo.mjs`)                    |
| upstream bytes | 91 399, sha256 `40afd68130375595d0cdb63cf453f3ce6bd68efe475ab3c5351aa7c333419e42`                           |
| licence        | AGPL-3.0-only, © 2026 Numen Games S.L. — the engine's licence and the one `REUSE.toml` gives `apps/**` here |

The file is the upstream bytes with a six-line header in front (what it is,
the commit, the hash). `test/cuerpo.test.ts` strips the header and checks
the hash, so an edit by hand or a half-done refresh fails the tests.
`puente-mundo.d.mts` holds the types the relay uses, written by hand.

## Refresh

1. In the engine, on the commit you want: `npm run puente`.
2. Copy `dist/puente-mundo.mjs` here behind the same six-line header, with
   the new commit, size and `sha256sum`.
3. Put the same commit and hash in this table and the hash in
   `test/cuerpo.test.ts` (`VENDORED_SHA256`).
4. If the bridge's API changed, update `puente-mundo.d.mts`, then
   `npm test --workspace @numinia/mcp`.
