# Numinia Digital Goods — Asset ID System Specification
## Version 1.0 — 2026-03-30

> This document is the definitive specification for how digital goods are
> identified in the Numinia ecosystem. It is designed to be read by both
> AI agents and human developers. Every decision is justified.
> If something is not covered here, it is intentionally out of scope.

## Context
This is the foundational ID system for a platform that will serve as the asset
registry for an open 3D internet / metaverse. The IDs are permanent — once
deployed, changing the format requires painful migration of URLs, NFT tokenURIs,
and cross-platform references. Every decision is justified.

## What this system IS and IS NOT

### IS: Asset identification
- Assigns a globally unique, permanent identifier to every digital good
- Works offline, without coordination, at any scale (IoT, MMO, single developer)
- Provides chronological ordering and cross-platform provenance

### IS NOT: User identity, ownership, or access control
These are separate layers with their own systems:

| Concern | Solved by | NOT by asset ID |
|---|---|---|
| User identity (SSI) | DID / wallet / ENS | UUID doesn't identify people |
| Asset ownership | NFT on-chain (contract + tokenId) | UUID doesn't prove ownership |
| Cryptographic verification | Creator's wallet signature | UUID doesn't sign anything |
| Anti-Sybil | Proof of humanity / wallet reputation | Anyone can generate UUIDs |
| Human-readable name | `name` field in JSON metadata | UUID is opaque by design |
| Portability + credentials | Verifiable Credentials / ZK proofs | Future layer, not asset ID |
| Selective disclosure | ZK proofs on NFT ownership | Future layer |
| Name resolution | ENS / .nexus / domain systems | Future layer |

**The UUID identifies the object. Metadata identifies everything else.**

## Decision Log

### Decision 1: UUID v7 (RFC 9562) as base ID
**Chosen:** UUID v7
**Rejected:** Custom timestamp+random (103 bits), ULID (128 bits), Snowflake (64 bits), sequential counter
**Why:**
- RFC standard — any developer, DB, or API understands UUIDs instantly
- 122 bits of entropy — collision impossible at any scale including IoT (billions of devices)
- Timestamp-sortable — first 48 bits are Unix ms, natural chronological order
- Native DB support — Postgres, MySQL 8+, MongoDB all have UUID column types
- Monotonic increment within same ms — the `uuidv7` npm library increments the random bits sequentially within the same millisecond, guaranteeing strict ordering even at thousands of IDs per ms
- Library support — JS, Python, Rust, Go, C#, Java, Unity, Unreal all have implementations
**Risk:** URLs are longer (23 chars with short ID vs 20 chars custom). Accepted tradeoff for standards compliance.

### Decision 2: ndg- prefix as namespace
**Chosen:** `ndg` (Numinia Digital Goods)
**Rejected:** `ng` (conflicts with Angular), `odg` (generic), configurable per game
**Why:**
- Identifies provenance — like ERC is from Ethereum but used everywhere
- Numinia creates the standard, any game can use `ndg-` IDs
- Short enough (4 chars with hyphen) for URLs
- Any future game that adopts the protocol uses the same prefix
**Risk:** Ties the standard name to Numinia. Accepted — Ethereum's ERC model works.

### Decision 3: Type stored in metadata, NOT in ID
**Chosen:** Type is a JSON field (`"type": "vrm"`)
**Rejected:** Type in ID (`ndg-vrm-...`)
**Why:**
- Shorter URLs — `ndg-019078e55a4c7b` vs `ndg-vrm-019078e55a4c7b`
- An asset's type doesn't change — but if we ever add a type, we don't want to change the ID
- The canonical form (`ndg:vrm:uuid:v0.1.0`) includes the type for formal registries
**Risk:** Can't filter by type from ID alone. Acceptable — all lookups go through metadata.

### Decision 4: Version is metadata + query param, NOT in ID
**Chosen:** ID stays the same across versions. Version in metadata. URL: `/assets/ndg-xxx?v=0.1.0`
**Rejected:** Version in ID (`ndg-xxx-v0.1.0`)
**Why:**
- Each link always points to a specific version (version-fija, like npm)
- Without `?v=`, the URL shows the latest version
- Player A can use v0.1.0, Player B can use v1.0.0 — same asset, different versions
- The canonical form includes version for formal records
**Risk:** Query param `?v=` can be lost when sharing. Mitigation: gallery always shows version in UI.

### Decision 5: Short ID for URLs derived from UUID
**Chosen:** First 16 hex chars of UUID (without hyphens) = 64 bits
**Why:**
- `ndg-019078e55a4c7b` = 23 chars total (acceptable for URLs, QR, embeds)
- Contains full timestamp (48 bits) + enough random (16 bits) to be unique in URLs
- Full UUID stored in metadata for formal records
- The short ID can always be expanded to full UUID by looking up metadata
**Risk:** 16 bits of random in short ID = 65K possibilities per ms. At extreme scale, two assets in the same ms could have the same short ID but different full UUIDs. Mitigation: use short ID for display only, full UUID for lookups.

### Decision 6: Status is metadata, visual badge only (File Over App)
**Chosen:** `status` field in JSON. Badges in UI. Files always downloadable.
**Rejected:** Blocking downloads for stolen items
**Why:**
- File Over App — the file exists on IPFS/Arweave permanently regardless
- Blocking on our platform is theater — the file is accessible elsewhere
- The status is social/reputational — the community decides if they respect it
- Status values: active, deprecated, stolen, cursed, frozen
**Risk:** Someone downloads a "stolen" asset from our platform. Accepted — CC0 assets are public by definition. For NFT-exclusive assets, access control is on-chain, not platform-side.

### Decision 7: NFT is metadata, chain-agnostic
**Chosen:** `nft` object in JSON with chain_id, contract, token_id, mint_status
**Why:**
- UUID exists before mint (pre-mint lifecycle)
- Chain may change (Ethereum → Base → future L2)
- mint_status tracks: unminted → pending → minted
- access_type: "original" (CC0+signed), "exclusive" (NFT-only), "access_key" (gating)
- NFT mint can happen on-chain without Numinia backend (smart contract verifies directly)
**Risk:** mint_status can get out of sync if we don't index on-chain events. Future work.

### Decision 8: Storage is multi-layer, metadata tracks all URLs
**Chosen:** `storage` object with r2, ipfs_cid, arweave_tx fields
**Why:**
- Serve priority: R2/CDN (fast) → IPFS gateway → GitHub raw (fallback)
- Archive: IPFS (own node, free) + Arweave (permanent, ~$5/GB one-time)
- Each layer is independent — if one goes down, others still work
- File Over App — metadata lists where copies exist
**Risk:** Keeping URLs in sync across layers. Future work — not blocking for initial implementation.

### Decision 9: Timestamp visible in ID (like Twitter/Discord)
**Chosen:** Timestamp decodable from UUID v7
**Rejected:** Ofuscated timestamp, full random
**Why:**
- Creation date of a public asset is not sensitive
- Enables debugging (when was this created?)
- Preserves natural sort order
- Twitter Snowflake and Discord both expose timestamps — industry practice
**Risk:** In military/private contexts, timestamp exposure is a problem. Not our use case.

### Decision 10: Monotonic generation within same ms
**Chosen:** Use `uuidv7` npm library which auto-increments within same ms
**Why:**
- Strict ordering guarantee even at thousands of IDs per millisecond
- No sequence counter needed — the library handles it internally
- Important for MMO forging scenario (100K players simultaneously)
**Risk:** Library-dependent behavior. Mitigation: test that ordering holds in our test suite.

## Corner Case Resolutions

### Resolution 1: No short ID — UUID completo siempre
**Decision:** No abstractions. Full UUID in URLs.
**URL:** `/assets/ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f`
**Why:** Zero ambiguity, zero extra logic, zero collision risk. Longer URLs are acceptable — this is an asset registry, not a URL shortener.

### Resolution 2: Version history in separate files
**Decision:** Catalog JSON lists only active version. History in `/versions/{uuid}.json`.
**Why:** Catalog stays clean. History is preserved but doesn't bloat the main file.
```
data/assets/numinia-assets.json:
  [{ "id": "ndg-019078e5-...", "version": "1.0.0", "status": "active" }]

data/versions/019078e5-5a4c-7b00-8000-1a2b3c4d5e6f.json:
  [{ "version": "0.1.0", "status": "deprecated", ... },
   { "version": "0.2.0", "status": "deprecated", ... },
   { "version": "1.0.0", "status": "active", ... }]
```

### Resolution 3: NFT mint_status updated manually by admin
**Decision:** Admin updates mint_status in panel after on-chain mint.
**Why:** No smart contract exists yet. No infra for webhooks. Manual is honest for current scale.
**Future:** When smart contract is deployed, add event indexer to auto-update.

## Final Schema

```json
{
  "id": "ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f",
  "canonical": "ndg:vrm:019078e5-5a4c-7b00-8000-1a2b3c4d5e6f:v0.1.0",

  "name": "Crystal Sword",
  "type": "glb",
  "version": "0.1.0",
  "previous_version": null,
  "status": "active",
  "status_reason": null,
  "license": "CC0",
  "creator": "PabloFMM",

  "description": "A crystal sword for games and VR",
  "model_file_url": "https://r2.numinia.store/...",
  "thumbnail_url": null,
  "format": "GLB",

  "project_id": "numinia-assets",

  "nft": {
    "type": "standard",
    "mint_status": "unminted",
    "chain_id": null,
    "contract": null,
    "token_id": null,
    "owner": null,
    "mint_tx": null
  },

  "storage": {
    "r2": "https://r2.numinia.store/...",
    "ipfs_cid": null,
    "arweave_tx": null,
    "github_raw": "https://raw.githubusercontent.com/..."
  },

  "is_public": true,
  "is_draft": false,
  "created_at": "2026-03-30T00:00:00Z",
  "updated_at": "2026-03-30T00:00:00Z",
  "metadata": {}
}
```

### Status values
- `active` — normal, visible, downloadable
- `deprecated` — old version, visible with badge, still downloadable
- `stolen` — flagged, red badge, still downloadable (File Over App)
- `cursed` — narrative/game mechanic, badge
- `frozen` — legal hold, badge

### NFT access_type
- `"original"` — CC0 base exists, NFT is the "signed original"
- `"exclusive"` — only NFT owner can download from platform
- `"access_key"` — NFT grants access to gated content

### NFT mint lifecycle (current: manual)
```
Admin uploads asset → nft.mint_status: "unminted"
Admin mints on-chain manually
Admin updates panel → mint_status: "minted", fills contract + token_id
```

## Implementation Plan

### Step 1: Install uuidv7 library
```bash
npm install uuidv7
```

### Step 2: Rewrite src/lib/asset-id.ts
- `generateAssetId()` → returns `ndg-{uuidv7}` (full UUID with prefix)
- `formatCanonical(id, type, version)` → returns `ndg:{type}:{uuid}:v{version}`
- `extractUUID(ndgId)` → strips `ndg-` prefix, returns raw UUID
- `isNuminiaId(id)` → validates `ndg-` + UUID v7 format
- Remove old slugify/timestamp/extensionToTypeCode logic

### Step 3: Update upload route (src/app/api/admin/upload/route.ts)
- Use new `generateAssetId()`
- Store `ndg-{uuid}` as `id`
- Add `version: "0.1.0"` for new uploads
- Add `canonical`, `status`, `nft`, `storage` fields to new entries
- File path uses full ID: `content/{type}/{id}.{ext}`

### Step 4: Update presign routes
- `src/app/api/admin/presign/route.ts` — use new generateAssetId()
- `src/app/api/admin/presign/confirm/route.ts` — add new schema fields

### Step 5: Update asset routes
- `src/app/api/assets/route.ts` POST handler — use UUID v7
- All lookups remain string equality on `id` field (backward compatible)

### Step 6: Create version history structure in data repo
- Create `data/versions/` directory
- When uploading a new version of existing asset, move old entry to `data/versions/{uuid}.json`

### Step 7: Update data repo JSON entries
- Add `canonical`, `version`, `status`, `nft`, `storage` fields
- Existing entries: `version: "1.0.0"`, `status: "active"`, `nft: null`

### Step 8: Tests
- UUID v7 format validation (`ndg-` + valid UUID)
- Canonical format construction
- Monotonic ordering within same ms
- Backward compatibility with old IDs (non-ndg IDs still work)
- `isNuminiaId()` correctly identifies new vs old format

### Step 9: Documentation
- Update CLAUDE.md with ID system spec
- Create ID_SYSTEM.md at project root as public specification

## Critical files to modify
- `src/lib/asset-id.ts` — complete rewrite
- `src/app/api/admin/upload/route.ts` — new ID generation + schema fields
- `src/app/api/admin/presign/route.ts` — new ID generation
- `src/app/api/admin/presign/confirm/route.ts` — new schema fields
- `src/app/api/assets/route.ts` — POST handler ID generation
- `src/__tests__/lib/asset-id.test.ts` — rewrite tests for UUID v7
- `CLAUDE.md` — update ID system section

## Data repo changes (numinia-digital-goods-data)
- Create `data/versions/` directory
- Update existing JSON entries with new fields (additive, backward compatible)

## Verification
- `npx tsc --noEmit` passes
- `npx vitest run` — all tests pass
- New uploads get IDs like `ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f`
- Old IDs (slug-timestamp, old ndg-type-slug-ts) continue to work
- URLs work: `/assets/ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f`
- Canonical format: `ndg:glb:019078e5-5a4c-7b00-8000-1a2b3c4d5e6f:v0.1.0`

---

## Use Cases — Validated

| # | Use case | Works? | How |
|---|---|---|---|
| 1 | Admin uploads GLB via web panel | Yes | `generateAssetId()` → UUID v7 with `ndg-` prefix |
| 2 | 100K MMO players forge items simultaneously | Yes | Each game server generates IDs independently, zero coordination |
| 3 | Player trades item to another player | Yes | ID unchanged, ownership updated in metadata |
| 4 | Same asset, multiple versions (v0.1 → v1.0) | Yes | Same UUID, different `version` field. History in `/versions/` |
| 5 | Player links specific version in Hyperfy world | Yes | URL with `?v=0.1.0` always resolves to that exact version |
| 6 | Asset marked as stolen | Yes | `status: "stolen"`, red badge, file still downloadable (File Over App) |
| 7 | Asset minted as NFT | Yes | Admin updates `nft.mint_status`, adds contract + tokenId manually |
| 8 | Two game shards merge | Yes | UUIDs are globally unique, no collision |
| 9 | Game server offline, no internet | Yes | UUID v7 generated locally, synced later |
| 10 | Migration to database (Postgres) | Yes | UUID is native column type, no conversion needed |
| 11 | Another game adopts ndg protocol | Yes | `ndg-` prefix identifies provenance, UUID is universal |
| 12 | IoT devices generating assets (future) | Yes | 122 bits entropy, RFC 9562 designed for this scale |
| 13 | 10M items/day for 278 years | Yes | UUID v7 has no practical upper limit |
| 14 | Asset has both CC0 version and NFT original | Yes | Same UUID, `nft.access_type: "original"` distinguishes |
| 15 | Rollback after server crash | Partial | IDs generated but not persisted are lost. New IDs generated on retry |

## Limits — What this system does NOT do

| Limitation | Why it's OK | Future solution |
|---|---|---|
| UUID is opaque (not human-readable) | `name` field is the human label. ID is for machines | ENS / .nexus name resolution |
| No cryptographic proof of who created the asset | Creator field is self-reported in JSON | Creator signs asset with wallet → Verifiable Credential |
| No proof of ownership without NFT | Ownership is a chain concern, not ID concern | NFT mint + on-chain registry |
| No anti-Sybil (anyone can generate UUIDs) | Asset creation is gated by admin auth (SIWE) | Proof of humanity for public uploads |
| No selective disclosure | All metadata is public JSON | ZK proofs on NFT ownership (future) |
| No automatic mint sync | Admin updates manually | Event indexer when smart contract deployed |
| No cross-chain identity | UUID is chain-agnostic by design | Bridge contracts or multichain indexer |
| Files can't be deleted from IPFS/Arweave | Immutable storage = permanent | `status: "stolen"` badge is the social layer |
| Version history grows indefinitely | Separate `/versions/` files, not in main catalog | Pagination or archival for very old versions |

## Architecture Layer Map

```
┌─────────────────────────────────────────────┐
│           USER IDENTITY LAYER               │
│  DID · Wallet · ENS · ZK Proofs            │
│  (NOT this spec — separate system)          │
├─────────────────────────────────────────────┤
│           OWNERSHIP LAYER                   │
│  NFT · Smart Contract · tokenId             │
│  (Metadata in asset JSON, mint is on-chain) │
├─────────────────────────────────────────────┤
│         ★ ASSET IDENTITY LAYER ★            │
│  UUID v7 · ndg- prefix · version · status   │
│  (THIS SPEC)                                │
├─────────────────────────────────────────────┤
│           STORAGE LAYER                     │
│  R2/CDN · IPFS · Arweave · GitHub           │
│  (URLs in storage metadata object)          │
├─────────────────────────────────────────────┤
│           DATA LAYER                        │
│  GitHub JSON (File Over App)                │
│  (Catalog + version history files)          │
└─────────────────────────────────────────────┘
```

Each layer is independent. This spec covers only the Asset Identity Layer.
Changes to other layers do not require changes to asset IDs.
