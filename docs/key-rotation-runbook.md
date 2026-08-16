# Key Rotation Runbook — every credential, its exact steps

> **For humans.** The guided 20-minute session that retires every inherited or aging credential. Repeat quarterly.
>
> **Epistemic value.** Ends "which keys exist and who minted them": the full inventory with rotation steps and verification.
> **Pragmatic value.** NEXT #1. The deploys run on an inherited token until this page is executed.
> **In the system.** Observes: deploy-runbook credentials table, ADR-018. Regulates: every secret. Coupled to: .github/workflows/deploy.yml, wrangler.jsonc, docs/status.md.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

## Inventory and steps (in execution order)

### 1. `CLOUDFLARE_API_TOKEN` (GitHub repo secret — INHERITED from the old repo, the standing risk)

1. Cloudflare dash → My Profile → API Tokens → Create Token → template **"Edit Cloudflare Workers"** (scopes: Account · Workers Scripts · Edit + Account Settings · Read + Zone · Workers Routes · Edit for the zone). Name: `numinia-web-deploy-YYYYMM`. TTL: 90 days.
2. GitHub repo → Settings → Secrets and variables → Actions → `CLOUDFLARE_API_TOKEN` → Update.
3. Verify: Actions → "Deploy to Cloudflare" → Run workflow → green smoke test.
4. Cloudflare dash → delete the OLD token. Done when the old token is dead, not before.

### 2. `AUTH_SESSION_SECRET` (Worker secret — now a graceful lever, MISSION-027)

1. Generate: `openssl rand -hex 32`
2. Overlap on: `npx wrangler secret put AUTH_SESSION_SECRET_PREVIOUS --name numinia-web` → paste the CURRENT value.
3. Rotate: `npx wrangler secret put AUTH_SESSION_SECRET --name numinia-web` → paste the NEW value.
4. Existing sessions stay valid until their own 1h TTL; new ones sign fresh. **After ≥1h**: `npx wrangler secret delete AUTH_SESSION_SECRET_PREVIOUS --name numinia-web` — the grace ends, rotation complete.
5. Update `apps/store/.env` locally with the new value.

### 3. `THIRDWEB_SECRET_KEY` (Worker secret + local .env)

1. thirdweb dashboard → project → Settings → regenerate secret key.
2. `npx wrangler secret put THIRDWEB_SECRET_KEY --name numinia-web` + update local `.env`.
3. Verify: log in at numinia.com/lap/session/ (Google or email is enough).

### 4. `STATE_GITHUB_TOKEN` (when D23 exists)

Fine-grained PAT · ONE repo (the state repo) · Contents: Read and write · 90-day TTL. Set as `STATE_GITHUB_TOKEN` Worker secret + `STATE_REPO_OWNER`/`STATE_REPO_NAME` vars. On rotation: mint new → put → revoke old.

### 5. R2 keys (`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`)

The platform currently READS the public bucket URL only — if these live
anywhere (legacy Vercel, old .env files), they gate the upload pipeline of
the future. Rotate in dash → R2 → Manage API tokens; store nowhere until
the upload flow lands.

### 6. Legacy Vercel project (~21 stale env vars)

Vercel dash → the old project → Settings → Environment Variables → delete
ALL → then delete the project itself (numinia.store now lives... verify
first what serves numinia.store before deleting the project — if it still
serves the store domain, only strip the vars).

### 7. Review, not rotate

- `ADMIN_WALLET_ADDRESSES` (Worker secret): confirm the allowlist is exactly the Oracles' wallets.
- `PUBLIC_THIRDWEB_CLIENT_ID` (repo variable): public by design; confirm allowed domains in the thirdweb dash list numinia.com + www + localhost:4321 only.

## Cadence

Quarterly, or immediately after: a laptop loss, a suspicious deploy, a
member departure, or any secret touching a screen-share. The night watch
(monitor.yml) and the deploy smoke test are the post-rotation verifiers.
