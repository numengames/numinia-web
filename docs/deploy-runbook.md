# Deploy Runbook — how numinia.com ships

> **For humans.** The single source on how the platform reaches numinia.com: triggers, gates, rollback, and how to verify from a country that blocks Cloudflare on match days.
>
> **Epistemic value.** Resolves "how does publishing work and what do I do when it breaks" without archaeology through workflow files.
> **Pragmatic value.** Deploy day is routine now; this file keeps it routine. Any deviation starts here.
> **In the system.** Observes: CI verdicts, Cloudflare state. Regulates: every publication. Coupled to: .github/workflows/deploy.yml, docs/status.md, docs/remote-checklist.md.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

## The flow (decided 2026-08-15 night, Oracle)

```
push to main ──► CI (quality · e2e · supply-chain) ──green──► Deploy (auto) ──► smoke test
                                                └──red──► nothing ships
```

- **Auto:** every CI run that finishes green on `main` deploys that exact SHA.
  No button. Publishing latency = CI duration (~4-10 min).
- **Manual (emergency lever):** Actions → "Deploy to Cloudflare" → Run workflow.
  It REFUSES commits whose CI is not green unless the `force` checkbox is
  ticked. Force is for outages, not for impatience.
- **Superseded guard:** if `main` moved on while an older CI was finishing,
  the older run does NOT ship (quiet skip with a notice) — the newer commit's
  own green CI ships it. An old rerun can never overwrite newer code.

## What ships

- One Worker: **`numinia-web`** (name = repo name; the one-Worker policy).
  Custom domains `numinia.com` + `www.numinia.com` live on it.
- Build: `npx turbo run build --filter=@numinia/store` with
  `DEPLOY_TARGET=cloudflare` and the **real catalog** (never fixtures).
- Deploy: `npx wrangler deploy -c wrangler.jsonc` (repo-root config).

## Credentials inventory

| Where | Name | What |
| --- | --- | --- |
| Repo secret | `CLOUDFLARE_API_TOKEN` | Deploy auth (inherited from pre-platform repo; **rotation pending**) |
| Repo secret | `CLOUDFLARE_ACCOUNT_ID` | Account `b4ad274110590f342408891b0b10056e` |
| Repo variable | `PUBLIC_THIRDWEB_CLIENT_ID` | Public by design; baked into the client bundle. Empty ⇒ deploy refuses |
| Worker secret | `THIRDWEB_SECRET_KEY` | `wrangler secret put`, set 2026-08-15 |
| Worker secret | `AUTH_SESSION_SECRET` | idem |
| Worker secret | `ADMIN_WALLET_ADDRESSES` | idem — the Oracle allowlist |

## The smoke test (what green means)

Every build is stamped with its own identity: **`https://numinia.com/version.json`**
carries the commit SHA and build time. After deploying, the workflow polls it
(up to 60s of edge propagation) and FAILS unless the live site serves exactly
the SHA it just built — no more "did it really ship?". Then it checks `/`,
`/city/`, `/lap/`, `/es/` answer **200** and `/api/auth/session` answers
**401** — 401 (not 503) proves the Worker secrets are loaded and auth fails
closed.

## Rollback (instant, no build)

Two paths:

1. **Actions → "Rollback numinia.com"** (experimental — not yet exercised in
   anger): leave `version_id` blank to restore the previous Worker version,
   or pass an explicit ID. It prints the version list first, restores at 100%
   traffic in ~30s (no build, no npm ci), and verifies the live site.
2. **Cloudflare dashboard** (always works): Workers → `numinia-web` →
   Deployments → pick a version → Rollback.

⚠️ With auto-deploy, a rollback only buys time: `main` still holds the bad
code, and the **next green CI ships it again**. Revert or fix on `main`
right after rolling back.

## Verifying from Spain on a match day

The Oracle's ISPs (fixed AND mobile) block Cloudflare edge IP ranges during
LaLiga hours. **Local curl/browser lies; never diagnose an outage from this
network.** Verify externally:

```
curl "https://api.hackertarget.com/httpheaders/?q=https://numinia.com"   # headers
curl -o shot.png "https://image.thum.io/get/width/1280/https://numinia.com"  # screenshot
```

(check-host.net is itself behind Cloudflare — useless during blocks.)

## Local build fallback (if GitHub is down)

```
set -a; source apps/store/.env; set +a
DEPLOY_TARGET=cloudflare npx turbo run build --filter=@numinia/store
npx wrangler deploy -c wrangler.jsonc      # needs `npx wrangler login` first
```

## History

- 2026-08-15 night: first deploy (manual button). Fresh-runner fixes chronicle
  in docs/status.md. Auto-deploy on green CI adopted the same night.
