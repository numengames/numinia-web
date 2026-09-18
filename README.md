# numinia-web

The site of the game: **[numinia.com](https://numinia.com)** — the city, the
CC0 catalogue of digital goods, the Codex, and the citizen's platform.

The rules of the house, its vocabulary and its decisions live in
[`numengames/numinia-nwos`](https://github.com/numengames/numinia-nwos)
(numinia.org). This repository holds code only.

## Layout

```
apps/store/     the site in production at numinia.com (Astro + React islands)
apps/com/       empty skeleton
packages/       domain · analytics · auth · state · ui
features/       Gherkin acceptance criteria (Cucumber)
```

## Run

```bash
npm ci
npm run ci                     # type-check → lint → test → build
cd apps/store && npm run dev   # http://localhost:4321 — needs .env, see .env.example
```

What CI runs, and the gates that are not obvious, are in [`CLAUDE.md`](CLAUDE.md).

## Licences

Per directory, declared in [`REUSE.toml`](REUSE.toml): `apps/*` AGPL-3.0-only,
`packages/*` MIT, documentation CC-BY-4.0, fixtures CC0-1.0, legal texts
reserved. Trademarks: [`TRADEMARKS.md`](TRADEMARKS.md).

Version and what changed: [numinia.com/updates](https://numinia.com/updates/).
