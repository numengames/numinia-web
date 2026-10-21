# Vendored: the world bridge (`puente-mundo.mjs`)

`puente-mundo.mjs` is numinia-engine's world bridge (`PuenteMundo`, its
eleven tools — among them `llamadas`, `esperar_llamada` and `gesto` — and
the token way of asking numinia.com for a world pass),
bundled by the engine into one ES module with platform «neutral»: no
`node:` import and no import at all, so it runs inside the relay's Durable
Object `Cuerpo` (`src/cuerpo.ts`, story W8) in workerd.

|                |                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| upstream       | `numengames/numinia-engine`, `packages/agent/src/puente-neutral.ts`                                           |
| commit         | `ce1174bbe263c8e97f21824533f172169aa94105` (branch `feat/ia-llamar`, PR #205, stories S12–S13; engine 0.32.0) |
| built with     | `npm run puente` in the engine (`tools/empaquetar-puente.mjs` → `dist/puente-mundo.mjs`)                      |
| upstream bytes | 126 900, sha256 `3a207576f4ba99262d35fa8b95197b6a2e9c7a4a57aabdd64bcdebaf056c41cc`                            |
| licence        | AGPL-3.0-only, © 2026 Numen Games S.L. — the engine's licence and the one `REUSE.toml` gives `apps/**` here   |

The file is the upstream bytes with a six-line header in front (what it is,
the commit, the hash). `test/cuerpo.test.ts` strips the header and checks
the hash, so an edit by hand or a half-done refresh fails the tests.
`puente-mundo.d.mts` holds the types the relay uses, written by hand.
The engine's PR #205 is open as this is vendored: refresh again on the
merge commit once it lands on `main` (same file, new commit).

## Refresh

1. In the engine, on the commit you want: `npm run puente`.
2. Copy `dist/puente-mundo.mjs` here behind the same six-line header, with
   the new commit, size and `sha256sum`.
3. Put the same commit and hash in this table and the hash in
   `test/cuerpo.test.ts` (`VENDORED_SHA256`).
4. If the bridge's API changed, update `puente-mundo.d.mts`, then
   `npm test --workspace @numinia/mcp`.

## The house's library (`biblioteca.json`)

What an AI may place with `colocar`: the engine's own list of house models,
each by the sha256 the worlds serve it by. The bridge only sends a model's
hash, never a file; `src/biblioteca.ts` reads the id, name and hash, and the
schema of `colocar` lists the ids (story W9).

|          |                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------- |
| upstream | `numengames/numinia-engine`, `features/objetos/biblioteca.json`                                       |
| commit   | `240002dcc5e3d81c174939f3b6f6c16ce4e35c4b` (the bridge's commit; the file last changed in `36281cc8`) |
| bytes    | 1 664, sha256 `dd78ba1f7d27046a421d9cf71ea71f9b61c3d6b9ffb715cc4c234cd99b711855`                      |
| licence  | AGPL-3.0-only, © 2026 Numen Games S.L. (each model's own licence is in the file: CC0 or own work)     |

Copied byte for byte, with no header (it is JSON); `test/herramientas-cuerpo.test.ts`
checks its hash against this table. Refresh it with the bridge: copy the
engine's file on the same commit and put its size and `sha256sum` here and in
that test (`LIBRARY_SHA256`).
