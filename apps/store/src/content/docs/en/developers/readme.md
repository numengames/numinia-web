---
legacy: true
title: 'For Developers'
description: 'API access, JSON database, and integration guides for Numinia Digital Goods'
---

# For Developers

Build on top of Numinia's open data. All asset metadata is freely available as JSON.

## Repositories

| Repo                                                                                 | Purpose                        |
| ------------------------------------------------------------------------------------ | ------------------------------ |
| [numinia-web](https://github.com/numengames/numinia-web)                             | Platform app (private while the rebuild stabilizes) |
| [numinia-digital-goods-data](https://github.com/PabloFMM/numinia-digital-goods-data) | JSON metadata + asset binaries |

## Getting the data

The legacy numinia.store API is retired. Today the open data is fetched directly
as raw JSON from the [data repository](https://github.com/PabloFMM/numinia-digital-goods-data)
— see [Asset Database](../../docs/developers/database/) for the schema and a
fetch example. A public API returns in a later phase.

## Tech Stack

- **Astro 7** (static-first) + **React 19** islands, TypeScript strict
- **Three.js** + @pixiv/three-vrm (3D rendering)
- **Progressive auth** — Web2 entry (Google, email, passkey) upgrading to SIWE
- **Cloudflare R2** + Arweave + IPFS (multi-layer storage)
- **UUID v7** (RFC 9562) asset ID system

## Resources

- [Asset Database](../../docs/developers/database/) — JSON structure and schema
- [Website Source Code](../../docs/developers/website/) — App repo and how to contribute
