---
title: "For Developers"
description: "API access, JSON database, and integration guides for Numinia Digital Goods"
---

# For Developers

Build on top of Numinia's open data. All asset metadata is freely available as JSON.

## Repositories

| Repo | Purpose |
|---|---|
| [numinia-digital-goods](https://github.com/PabloFMM/numinia-digital-goods) | Next.js 16 app (code) |
| [numinia-digital-goods-data](https://github.com/PabloFMM/numinia-digital-goods-data) | JSON metadata + asset binaries |

## API Endpoints

```
GET https://numinia.store/api/assets              — All assets (filterable)
GET https://numinia.store/api/assets?search=avatar — Search by name
GET https://numinia.store/api/collections          — All collections
GET https://numinia.store/api/nft/check-ownership?address=0x...&contract=0x...  — NFT check
```

## Tech Stack

- **Next.js 16** (App Router, React 18, TypeScript)
- **Three.js** + @pixiv/three-vrm (3D rendering)
- **SIWE** (Sign-In with Ethereum) + GitHub OAuth
- **Cloudflare R2** + Arweave + IPFS (multi-layer storage)
- **UUID v7** (RFC 9562) asset ID system

## Resources

- [Asset Database](/en/resources/developers/database) — JSON structure and schema
- [Website Source Code](/en/resources/developers/website) — App repo and how to contribute
