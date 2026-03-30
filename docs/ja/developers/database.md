---
title: "Asset Database"
description: "JSON structure and schema for the Numinia data repository"
---

# Asset Database

All Numinia metadata is stored as JSON in the [data repository](https://github.com/PabloFMM/numinia-digital-goods-data).

## Structure

```
data/
├── projects.json                    ← Project index
├── assets/numinia-assets.json       ← GLB models
├── avatars/numinia-avatars.json     ← VRM avatars
├── worlds/numinia-worlds.json       ← HYP worlds
├── audio/numinia-audio.json         ← Audio files
├── video/numinia-video.json         ← Video files
├── images/numinia-images.json       ← Images
└── 3dprint/numinia-3dprint.json     ← STL files

content/
├── models/      ← GLB binaries
├── avatars/     ← VRM binaries
├── worlds/      ← HYP binaries
├── audio/       ← MP3/OGG files
├── video/       ← MP4/WebM files
├── images/      ← JPG/PNG files
├── 3dprint/     ← STL files
└── thumbnails/  ← PNG previews
```

## Asset Schema

Every asset entry follows this structure:

```json
{
  "id": "ndg-019d3ded-a1dd-7e0e-aeff-cb155bdff3d8",
  "canonical": "ndg:vrm:019d3ded-...:v0.1.0",
  "name": "Avatar Lyra",
  "type": "vrm",
  "format": "VRM",
  "version": "0.1.0",
  "status": "active",
  "license": "CC0",
  "creator": "PabloFMM",
  "description": "VR-ready avatar",
  "tags": ["avatar", "humanoid"],
  "model_file_url": "https://pub-eda9...r2.dev/content/avatars/ndg-019d3ded-....vrm",
  "thumbnail_url": "https://raw.githubusercontent.com/.../thumbnails/ndg-019d3ded-....png",
  "file_size_bytes": 2608148,
  "nft": {
    "mint_status": "unminted",
    "chain_id": null,
    "contract": null,
    "token_id": null
  },
  "storage": {
    "r2": "https://...",
    "github_raw": "https://...",
    "ipfs_cid": null,
    "arweave_tx": null
  },
  "is_public": true,
  "created_at": "2026-03-30T...",
  "updated_at": "2026-03-30T..."
}
```

## Asset ID System

Format: `ndg-{uuid-v7}` (RFC 9562, timestamp-sortable, 122 bits entropy).

See [ID_SYSTEM.md](https://github.com/PabloFMM/numinia-digital-goods/blob/main/ID_SYSTEM.md) for the full specification.

## Fetch Data

```javascript
const res = await fetch(
  'https://raw.githubusercontent.com/PabloFMM/numinia-digital-goods-data/main/data/avatars/numinia-avatars.json'
);
const avatars = await res.json();
```

Or via the API:

```
GET https://numinia.store/api/assets
GET https://numinia.store/api/assets?search=avatar
```
