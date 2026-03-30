---
title: "Arweave Storage"
description: "How Numinia uses Arweave for permanent, decentralized asset storage"
---

# Arweave Storage

Numinia uses [Arweave](https://arweave.org) for permanent, decentralized storage of digital assets.

## Why Arweave

- **Permanent** — files stored forever, cannot be deleted or taken offline
- **One-time payment** — no subscriptions, no renewal fees
- **Decentralized** — no single company controls the data
- **Verifiable** — every file has a transaction ID that proves its existence

## How It Works

When an admin archives an asset, Numinia uploads the binary file to Arweave via the [ArDrive Turbo SDK](https://ardrive.io). The transaction ID is stored in the asset's `storage.arweave_tx` field.

Each upload is tagged with:
- `Content-Type` — the file's MIME type
- `App-Name` — `Numinia-Digital-Goods`
- `Asset-ID` — the UUID v7 identifier
- `Asset-Name` — the human-readable name

## Storage Layers

Arweave is one of four storage layers in Numinia:

| Layer | Purpose | Speed | Permanence |
|---|---|---|---|
| Cloudflare R2 | CDN delivery | Fast | Depends on billing |
| GitHub | Metadata + small files | Medium | Depends on repo |
| **Arweave** | **Permanent archive** | Slow | **Forever** |
| IPFS | Distributed access | Medium | While pinned |

## Access

Any Arweave file is accessible via gateway:

```
https://arweave.net/{transaction_id}
```
