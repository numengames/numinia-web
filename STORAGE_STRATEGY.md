# Numinia Storage Strategy — Plan & Documentation

## Context
The platform currently uploads assets via GitHub API (limited to 3.5MB by Vercel).
Presigned upload code for R2 is already written and ready (`src/lib/r2-client.ts`,
`/api/admin/presign/`, `/api/admin/presign/confirm/`). We need to:
1. Create Cloudflare account + R2 bucket + API keys
2. Add env vars to Vercel
3. Test presigned upload with real R2
4. Document the full storage strategy for future layers (IPFS, Arweave)

## Storage Architecture (File Over App)

```
┌──────────────────────────────────────────────┐
│                UPLOAD                        │
│  Admin panel → presigned URL → R2            │
│  (fallback: GitHub API for <3.5MB)           │
├──────────────────────────────────────────────┤
│              SERVE (priority order)          │
│  1. R2/CDN (fastest, Cloudflare edge)        │
│  2. IPFS gateway (decentralized, future)     │
│  3. GitHub raw (fallback, always available)   │
├──────────────────────────────────────────────┤
│              ARCHIVE (permanence)            │
│  • IPFS own node (free, under our control)   │
│  • Arweave (permanent, pay once ~$5/GB)      │
├──────────────────────────────────────────────┤
│              METADATA                        │
│  GitHub JSON (File Over App, auditable)      │
│  Each asset has storage object:              │
│  { r2, ipfs_cid, arweave_tx, github_raw }   │
└──────────────────────────────────────────────┘
```

## Phase 1: Cloudflare R2 (NOW)

### What the user needs to do

1. **Go to:** https://dash.cloudflare.com
2. **Sign up** (free account, no credit card needed for free tier)
3. **After login:** Left sidebar → R2 Object Storage → Create bucket
4. **Bucket name:** `numinia-assets` (or whatever you prefer)
5. **Location:** Automatic (Cloudflare picks nearest)
6. **Create the bucket**
7. **Go to:** R2 → Overview → Manage R2 API Tokens → Create API Token
8. **Permissions:** Object Read & Write
9. **Specify bucket:** `numinia-assets`
10. **Create → Copy the values:**
    - Account ID (visible in URL: `dash.cloudflare.com/{ACCOUNT_ID}/r2`)
    - Access Key ID
    - Secret Access Key
11. **Enable public access:** R2 bucket → Settings → Public Access → Allow
    - This gives you a URL like: `https://pub-{hash}.r2.dev`
    - Or set up custom domain: `r2.numinia.store`

### Env vars to add in Vercel

| Variable | Value | Where to find it |
|---|---|---|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID | URL bar in dashboard |
| `R2_ACCESS_KEY_ID` | From API token creation | Step 10 above |
| `R2_SECRET_ACCESS_KEY` | From API token creation | Step 10 above |
| `R2_BUCKET_NAME` | `numinia-assets` | The name you chose |
| `R2_PUBLIC_URL` | `https://pub-{hash}.r2.dev` | R2 bucket → Settings → Public Access |

### What's already coded (ready to use)

| File | Purpose | Status |
|---|---|---|
| `src/lib/r2-client.ts` | S3Client for R2, `isR2Configured()` | ✅ Ready |
| `src/app/api/admin/presign/route.ts` | Generates presigned PUT URL | ✅ Ready |
| `src/app/api/admin/presign/confirm/route.ts` | Creates metadata after upload | ✅ Ready |
| `src/components/admin/AssetUpload.tsx` | Client: presigned flow + progress bar + GitHub fallback | ✅ Ready |
| `src/app/api/assets/[id]/route.ts` | DELETE: removes from R2 if configured | ✅ Ready |
| `src/lib/env.ts` | R2 env vars (all optional, graceful fallback) | ✅ Ready |

### R2 Free Tier Limits

| Resource | Free | Enough? |
|---|---|---|
| Storage | 10 GB/month | Yes — hundreds of assets |
| Class A operations (writes) | 1M/month | Yes — admin uploads only |
| Class B operations (reads) | 10M/month | Yes — CDN serves cached |
| Egress | Unlimited | Yes — R2's killer feature |

### After R2 is configured

The upload flow automatically switches:
```
Before R2: File → Vercel serverless → GitHub API (3.5MB limit)
After R2:  File → presigned URL → R2 directly (500MB limit, with progress bar)
           Metadata → GitHub API (just the JSON entry)
```

No code changes needed. The `AssetUpload.tsx` component tries presigned first,
falls back to GitHub if R2 returns 503.

## Phase 2: IPFS (PREPARED, NOT ACTIVE)

### Strategy
- Install Kubo (go-ipfs) on dedicated server when ready
- Pin all R2 assets to IPFS for decentralized redundancy
- Store CID in asset metadata: `storage.ipfs_cid`
- IPFS gateway as secondary serve layer

### What we'll build (when ready)
- `src/lib/ipfs-client.ts` — Kubo RPC client
- `/api/admin/pin-to-ipfs` — admin endpoint to pin an asset
- Batch script to pin all existing assets
- Update `assetUrls.ts` to try IPFS gateway after R2

### Resources
- **Kubo install:** https://docs.ipfs.tech/install/command-line/
- **Pinata (hosted alternative):** https://www.pinata.cloud
- **web3.storage:** https://web3.storage
- **IPFS gateway:** https://ipfs.io/ipfs/{cid} or run your own

### IPFS on own server
```bash
# Install Kubo on Ubuntu/Debian
wget https://dist.ipfs.tech/kubo/v0.27.0/kubo_v0.27.0_linux-amd64.tar.gz
tar -xvzf kubo_v0.27.0_linux-amd64.tar.gz
sudo bash kubo/install.sh
ipfs init
ipfs daemon &

# Pin a file
ipfs add /path/to/asset.vrm
# Returns: added QmXyz... asset.vrm

# Access via gateway
# http://localhost:8080/ipfs/QmXyz...
```

Not mandatory to be always active — files pinned to IPFS remain available
through other nodes that also pin them. Your node is just one source.

## Phase 3: Arweave (FUTURE)

### Strategy
- Pay-once permanent storage for finalized assets (v1.0.0+)
- Don't archive drafts or deprecated versions
- Store TX ID in metadata: `storage.arweave_tx`
- ~$5/GB one-time cost

### Resources
- **Arweave:** https://arweave.org
- **ArDrive (web UI):** https://ardrive.io
- **Irys (SDK, formerly Bundlr):** https://irys.xyz
- **ar.io gateways:** https://ar.io

### What we'll build (when ready)
- `src/lib/arweave-client.ts` — Irys SDK integration
- `/api/admin/archive-to-arweave` — admin endpoint to archive
- Cost estimation before upload
- Update `assetUrls.ts` to resolve Arweave TX IDs

## Phase 4: S3 (LATER)

Already used at Numen Games. Will integrate when needed for:
- Legacy system compatibility
- Backup redundancy
- Regions where R2 isn't optimal

## Redundancy Policy

### Upload behavior: Automatic to all configured layers
When admin uploads an asset, the system automatically pushes to every
storage layer that is configured (has env vars set and is reachable).
No checkboxes, no manual selection. Each layer activates by env vars.

```
Admin uploads "Crystal Sword.glb":
  → R2: ✓ (R2_* env vars set) — immediate, presigned
  → IPFS: ✓ (IPFS_API_URL set, node reachable) — async pin after upload
  → GitHub: ✓ (always, metadata JSON)
  → Arweave: ✗ (manual only — costs money)
```

### Arweave: manual only, never automatic
Arweave costs ~$5/GB and is permanent (can't delete).
Admin sees a button "Archive to Arweave" with cost estimation.
Only admin decides when to spend AR tokens.

### Layer activation via env vars

| Layer | Env vars needed | Auto-upload? |
|---|---|---|
| R2/CDN | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Yes |
| IPFS | `IPFS_API_URL` (e.g., `http://localhost:5001`) | Yes (async) |
| S3 | `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` | Yes |
| Arweave | `ARWEAVE_WALLET_PATH` or `IRYS_PRIVATE_KEY` | No (manual only) |
| GitHub | `GITHUB_TOKEN` (always set) | Yes (metadata always) |

### Cost comparison for budgeting

| Layer | Storage | Egress | Upload | Monthly at 10GB |
|---|---|---|---|---|
| R2 | Free (10GB) | Free | Free (1M ops) | $0 |
| IPFS own node | Free (disk) | Free | Free | $0 (server cost only) |
| Arweave | ~$5/GB once | Free | One-time | ~$50 once, then $0 |
| S3 | $0.023/GB | $0.09/GB | $0.005/1K | ~$1.13/month |
| GitHub | Free (public) | Free | Free | $0 |

**10GB of assets on all layers: ~$51 one-time (Arweave) + $1.13/month (S3)**
Without S3 and Arweave: $0/month

## Decision Log

### Why R2 first (not S3)
- Zero egress fees (S3 charges for every download)
- Free tier is generous (10GB)
- S3-compatible API (same SDK, same code)
- Cloudflare edge = fast globally
- You already have the S3 code in the codebase

### Why IPFS before Arweave
- IPFS is free (your own node)
- IPFS is content-addressed (CID verifies integrity)
- Arweave costs money and is permanent — only for finalized assets
- IPFS for distribution, Arweave for permanence

### Why not Filecoin directly
- Filecoin requires deals with storage providers (complex)
- web3.storage abstracts Filecoin away (uses it under the hood)
- For now, own IPFS node is simpler and free

## Serving Priority Chain (to implement in assetUrls.ts)

```
Request for asset file:
  1. storage.r2         → Cloudflare R2 CDN (fastest, edge-cached)
  2. storage.s3         → Amazon S3 (when configured)
  3. storage.ipfs_cid   → IPFS gateway (decentralized)
  4. storage.arweave_tx → ar.io gateway (permanent)
  5. storage.github_raw → GitHub raw (always available, slowest)
```

Each layer is independent. If R2 goes down, next available serves.
The system tries each URL in order until one returns 200.

### Asset Integrity
Every asset stores a SHA-256 hash at upload time:
```json
{
  "file_size_bytes": 3847360,
  "file_hash": "sha256:a1b2c3d4e5f6...",
}
```
- Verify integrity: download file → compute SHA-256 → compare
- Deduplication: same hash = same file → skip duplicate storage on IPFS/Arweave
- IPFS CID also verifies content, but SHA-256 is layer-agnostic

### Geographic Strategy
- **Primary region: EU (legal entity in Europe)**
- R2 bucket location: EU (WEUR)
- S3 bucket: eu-west-1 (Ireland, same as Numen AWS)
- IPFS own node: European server
- Arweave: network-wide (no region control, acceptable)
- Cloudflare edge caching distributes globally after first access
- **Future**: replicate to US/Asia when traffic justifies it. Document in env vars:
  `R2_REGION=WEUR` (prepared but not enforced in code yet)

### Cache Headers (critical for performance)
Assets with version are immutable by design → infinite cache:
```
Cache-Control: public, max-age=31536000, immutable
```
R2 custom domain or Workers can set this. Configure in Cloudflare dashboard.

### Hot/Cold Lifecycle Rules
- **Default**: 90 days without downloads → eligible for cold storage
- **Configurable**: `COLD_STORAGE_DAYS` env var (default 90)
- **Cold = Arweave-only**: R2 copy deleted, served from Arweave gateway
- **Re-heat**: if someone requests a cold asset, re-upload to R2 from Arweave
- **Implementation**: future cron job or Cloudflare Worker
- **Not implemented now** — documented as policy, parametrizable for future

### Rate Limiting
- Cloudflare WAF (free plan) handles rate limiting at edge
- Configure in dashboard: Security → WAF → Rate limiting rules
- Suggested: 100 requests/min per IP for asset downloads
- No code changes needed — Cloudflare handles it

### File Over App guarantee
Even if Numinia disappears tomorrow:
- IPFS: anyone with the CID can access the file from any node
- Arweave: permanent, accessible via any ar.io gateway forever
- GitHub: public repo, anyone can fork
- The metadata JSON describes where copies exist

No single point of failure. No vendor lock-in.

## Monitoring & Analytics

### Asset Stats Endpoint (implement now)
`GET /api/admin/stats` — requires admin session

Returns:
```json
{
  "total_assets": 10,
  "by_type": { "vrm": 5, "glb": 3, "hyp": 2 },
  "total_size_bytes": 47403827,
  "by_status": { "active": 9, "deprecated": 1 },
  "by_layer": {
    "r2": 3,
    "ipfs": 0,
    "arweave": 0,
    "github": 10
  },
  "nft": { "minted": 0, "unminted": 10, "pending": 0 },
  "versions": { "active": 10, "deprecated": 0 }
}
```

### Provider Dashboards (built-in, no code needed)
| Provider | Dashboard | URL |
|---|---|---|
| R2 | Cloudflare Dashboard | https://dash.cloudflare.com → R2 |
| S3 | AWS CloudWatch | console.aws.amazon.com |
| IPFS | Kubo WebUI | http://localhost:5001/webui |
| Arweave | ViewBlock | https://viewblock.io/arweave |
| GitHub | Traffic insights | github.com/{repo}/graphs/traffic |

### NFT Analytics
| Tool | Purpose | URL |
|---|---|---|
| **Dune Analytics** | On-chain SQL queries (mints, transfers, holders) | https://dune.com |
| **Etherscan** | Contract + TX explorer | https://etherscan.io |
| **Zora/OpenSea** | Marketplace analytics | depends on chain |

### Web Traffic Analytics (future)
**Recommendation: Umami** (https://umami.is)
- MIT license (aligned with open source philosophy)
- Self-hosted on own server (File Over App)
- Privacy-first, no cookies (no GDPR banner)
- API for custom dashboards
- Can deploy on Vercel or Docker

Not implementing now — document for future sprint.

## All Providers Summary

| # | Provider | Type | Cost (10GB) | Egress | Open Source | Status |
|---|---|---|---|---|---|---|
| 1 | Cloudflare R2 | CDN | $0/mo | Free | No | **NOW** |
| 2 | Amazon S3 | Cloud | $0.23/mo | $0.90/GB | No | Later |
| 3 | IPFS Kubo | P2P | $0 (server) | Free | Yes (MIT) | Prepared |
| 4 | Arweave/Irys | Permanent | ~$50 once | Free | Yes | Manual |
| 5 | GitHub raw | Git | $0 | Free | Yes | Active |
| 6 | Pinata | IPFS hosted | $0-20/mo | Free | No | Alternative |
| 7 | web3.storage | Filecoin | $0 (5GB) | Free | Yes | Alternative |

### Total cost at current scale (~50MB of assets)
- R2 only: **$0/month**
- R2 + S3: **~$0.01/month**
- R2 + IPFS (own node): **$0/month** (server cost excluded)
- R2 + Arweave: **$0.25 one-time**
- All layers: **$0.26 one-time + ~$0.01/month**

## Implementation Steps (Phase 1 only)

### Step 1: User creates Cloudflare account + R2 bucket (manual)
Follow the R2 setup guide above.

### Step 2: Add env vars to Vercel (manual)
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

### Step 3: Code changes
- Add `file_size_bytes` and `file_hash` (SHA-256) to `createAssetMetadata()` in `asset-id.ts`
- Update upload route: compute SHA-256 of file buffer, pass size + hash
- Update presign route: return assetId + r2Key (hash computed client-side or after upload)
- Update presign confirm route: accept fileSize + fileHash
- Create `GET /api/admin/stats` endpoint (admin only)
- Save `STORAGE_STRATEGY.md` to project root (this document, cleaned up)
- Update AssetUpload.tsx: compute SHA-256 client-side before upload (for deduplication)

### Step 4: Redeploy on Vercel
Presigned upload flow activates automatically when R2 vars are set.

### Step 5: Test
- Upload a 8MB VRM via admin → progress bar → success
- Check R2 dashboard → file in bucket
- Check `/api/admin/stats` → shows correct counts + sizes
- Gallery shows new asset

## Extended Metadata (future-proof, stored in metadata: {})

These fields are optional. The `metadata` object is a catch-all
extensible by design. No schema changes needed to add them later.

| Field | Type | Standard | When to add |
|---|---|---|---|
| `content_type` | string (MIME) | HTTP | Now (auto-detect at upload) |
| `bounding_box` | {x,y,z} | glTF | When 3D parser available |
| `tags` | string[] | Schema.org | When tag UI exists |
| `preview_animation_url` | string | OpenSea/NFT | When video previews exist |
| `vertex_count` | number | glTF | When 3D parser available |
| `texture_count` | number | glTF | When 3D parser available |
| `bone_count` | number | VRM spec | When VRM parser available |
| `vrm_version` | string | VRM spec | When VRM parser available |
| `dimensions_cm` | {w,h,d} | glTF | When 3D parser available |

All of these go in `metadata: { ... }` — backward compatible, no migration.

## Verification
- `npx tsc --noEmit` passes
- `npx vitest run` — all tests pass
- Upload large file → presigned flow works
- `/api/admin/stats` → returns correct data
- Old assets without `file_size_bytes` don't break anything
- `file_hash` matches SHA-256 of downloaded file
