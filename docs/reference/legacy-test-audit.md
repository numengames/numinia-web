# Legacy Test Suite Audit — numinia-digital-goods v0.1.0

> Read-only audit authorized by the Oracle on 2026-08-14 as a bounded exception to the legacy ban.
> Purpose: harvest bugs, coverage gaps, and lessons before the rebuild writes its first test. **Zero lines reused.**
> Method: static analysis — all 17 test files (1,674 lines) read in full and cross-checked against 10 implementation
> modules they exercise. The suite was **not executed**: installing `node_modules` would write into the condemned
> repository. Findings are labeled **CONFIRMED** (test + implementation read and agree) or **PLAUSIBLE** (inferred,
> would need execution to prove).

## Scope

| Suite | Files | Focus |
|---|---|---|
| `src/__tests__/lib/` | 12 | asset-id, auth sessions, content-paths, download-utils, env, hypParser, mime, rank, rate-limit, session/CSRF, useFavorites |
| `src/__tests__/api/` | 5 | assets CRUD, presign, proxy-asset, stats, visibility |

Implementations read: `session.ts`, `auth/getSession.ts`, `mime-validation.ts`, `rate-limit.ts`, `content-paths.ts`, `download-utils.ts`, `asset-id.ts`, `utils/hypParser.ts`, `api/proxy-asset/route.ts`, `api/admin/presign/route.ts` (+ `schemas.ts`, `env.ts` excerpts).

---

## A. Bugs in the tests themselves

### A1 — `hypParser.test.ts` is tautological: it never imports the module it names — **CONFIRMED, worst finding**
The file tests "hypParser format" but never imports `parseHypFile` from `src/lib/utils/hypParser.ts`. It builds a buffer, then *re-implements the parsing logic inline* ("Parse manually (same logic as hypParser.ts)") and asserts its own re-implementation. Result: 137 lines of green tests, **0% coverage of the real parser**, and none of the parser's actual bugs (see B8) are catchable. This is the canonical failure mode of "tests that test the test."

### A2 — Test name contradicts its own assertion — **CONFIRMED**
`content-paths.test.ts`: `it('returns empty uppercase for no extension')` asserts `getFormat('noext') === 'NOEXT'` — neither empty nor an extension. The test *enshrines* an implementation bug (`split('.').pop()` returns the whole filename when there is no dot) under a name that claims the opposite behavior.

### A3 — `env.test.ts` tests almost nothing — **CONFIRMED**
Only shape checks (`typeof x === 'string'`). The two behaviors that matter — crash at boot when a required var is missing, and the `NEXT_PHASE`/`SKIP_ENV_VALIDATION` skip logic (which exists in `env.ts:62-68`) — are untested. The header comment admits it. A test suite that cannot fail is documentation, not verification.

### A4 — Env-var cleanup inside the test body leaks state on failure — **CONFIRMED**
`getSession.test.ts` sets `process.env.ADMIN_WALLET_ADDRESSES` and deletes it *after* the assertions in the same test body. If an `expect` throws, the delete never runs and the admin address leaks into subsequent tests. `adminRouteProtection.test.ts` does it correctly with `afterEach` — and, incidentally, duplicates four of the same cases (drift risk between twin suites).

### A5 — The real security gate is never tested, only mocked — **CONFIRMED**
Every API test mocks `requireRank` (and `verifyCsrf` to `() => true`). `requireRank` / `verifyUserSession` / `getSessionWithRank` — the only code that *verifies JWT signatures* — has **zero test coverage anywhere in the suite**. The tests that look like auth tests (`getSession.test.ts`) cover only the *unverified decode* helpers. Consequence: B2 below shipped invisible.

### A6 — API tests assert mock plumbing, not behavior — **CONFIRMED**
`assets.test.ts` POST asserts `data.id === 'ndg-test-id'` — the mocked `generateAssetId` passthrough. `presign.test.ts` asserts `uploadUrl === 'https://r2.example.com/signed-url'` — the mocked signer. Valid smoke tests of routing/validation glue, but they verify the mocks' return values, not domain behavior; combined with A5 the security-relevant branches (CSRF 403, rate-limit 429) have no route-level test.

### A7 — `rate-limit.test.ts` covers one of three paths — **CONFIRMED**
In-memory happy path only. Untested: window expiry (no fake timers — nothing proves a blocked key recovers), the entire Redis path, the Redis→memory failover, concurrency, and `getRateLimitKey` (header parsing). See B5 for the bug living in the untested half.

### A8 — `mime-validation.test.ts` never tests VRM, WEBP, MP3-sync, or Node Buffers — **CONFIRMED**
VRM — the platform's flagship format — has a signature entry in the implementation but no test. The multi-signature WEBP path, the MP3 sync-bytes fallback, and the `Buffer` input branch (see B3) are all untested.

### A9 — Flaky-prone timing tests in `asset-id.test.ts` — PLAUSIBLE
"produces different IDs on sequential calls" sleeps 2 ms unnecessarily (uuidv7 monotonicity already guarantees uniqueness); "IDs are chronologically sortable" depends on a 5 ms sleep. Both pin behavior of the `uuidv7` *library*, not project code — acceptable as invariant pins, but mislabeled as unit tests of `asset-id.ts`.

### A10 — `useFavorites.test.ts` tests a pattern the platform bans — CONFIRMED (observation)
Solid little suite (incl. corrupted-storage case) for a hook built on `localStorage` in components — the exact pattern the rebuild constitution forbids. Nothing to fix; a reminder that good tests can cement a banned architecture.

---

## B. Implementation defects the tests miss — or worse, enshrine

### B1 — Forged-cookie admin: hidden assets disclosed via unverified JWT — **CONFIRMED, enshrined by tests**
`getAdminSession()` base64-decodes `tw_jwt` **without signature verification** and grants `isAdmin` if `payload.sub` is in `ADMIN_WALLET_ADDRESSES`. Wallet addresses are public by nature (on-chain). Anyone can mint an unsigned JWT `{sub: "<admin address>"}`, set the cookie, and `GET /api/assets` returns **all** assets including `isPublic: false` and drafts. The test suite *asserts this as expected behavior* (`'returns all avatars for admin'` with a `fakeJwt` helper whose signature is literally `"fakesig"`). The code comment says "non-critical reads (e.g. show hidden assets to admin)" — but hidden-asset disclosure *is* access control. Severity: information disclosure, trivially exploitable.

### B2 — `requireRank` fails **open** when Thirdweb env is missing — **CONFIRMED (code path), untested**
`verifyUserSession()`: if `getThirdwebAuth()` returns null (env not configured), it silently falls back to *unverified decode* — meaning every mutation route "protected" by `requireRank` accepts forged JWTs in any misconfigured deployment. The docstring on `getSessionWithRank` claims "VERIFIES JWT signature" unconditionally. Security boundaries must fail **closed**; a missing signing config should 401, not trust.

### B3 — `validateMimeType` reads the wrong bytes for pooled Node Buffers — **CONFIRMED (code), untested**
`new Uint8Array(buffer.buffer, 0, …)` ignores `buffer.byteOffset`. Node pools small Buffers into shared slabs with non-zero offsets, so magic-byte checks can run against unrelated slab memory → false accepts/rejects. Tests only ever pass `ArrayBuffer`s, so the branch is invisible. Also: unknown extensions return `true` (permissive by design — asserted by the test as "passthrough"), which inverts the module's stated purpose ("prevents uploading executables renamed to .glb").

### B4 — Proxy allowlist is effectively open, with a public cache and `*` CORS — **CONFIRMED, partially enshrined**
`proxy-asset` allows `r2.dev` with `endsWith('.r2.dev')` → **any Cloudflare R2 public bucket in the world**, i.e. attacker-controlled content proxied and cached (`public, max-age=86400`) under the trusted first-party domain. `raw.githubusercontent.com` similarly allows any GitHub repo. No response-size cap (`arrayBuffer()` of unbounded content → memory DoS). The test asserts `Access-Control-Allow-Origin: '*'` as expected. Hostname matching itself is done correctly (no substring bypass) — the flaw is the allowlist contents, which no test challenges.

### B5 — Redis rate limiter is not atomic despite claiming it — **CONFIRMED (code), untested**
`checkRedis` runs *(zremrangebyscore + zcard)*, then decides, then *zadd* in a **separate** pipeline. N concurrent requests can all read the same count and all pass → limit overshoot under burst (exactly when limits matter). The comment says "atomic". Bonus latent bug: the in-memory cleanup interval hard-codes a 120 s retention filter — any limiter configured with `windowMs > 120000` would have its entries purged early (all current configs are 60 s, so latent). The only tested path is single-threaded in-memory.

### B6 — Substring URL classifiers with false positives — **CONFIRMED, enshrined**
`isIPFSUrl` = `url.includes('ipfs')` — matches `https://arweave.net/ipfs-notes.pdf`. The test suite asserts substring behavior as intended. `isGitHubRawUrl` matches `?x=raw.githubusercontent.com` in any URL. URL classification must parse hostnames, not grep strings.

### B7 — `getFileExtension` defaults every unknown format to `.vrm` — **CONFIRMED, enshrined**
Three tests bless `'voxel' | 'unknown' | ''` → `.vrm`. A wrong-but-tested default is the hardest kind to remove.

### B8 — `parseHypFile` trusts attacker-controlled lengths and leaks blob URLs — **CONFIRMED (code), untestable by A1's suite**
`headerSize` and each `asset.size` come from the file itself and are unvalidated; hostile values throw `RangeError`, which the blanket `catch` converts to `null` (survivable but indistinguishable from "not a hyp"). Blob URLs already created are never revoked when a later asset throws (memory leak). `console.error` in the production path. `header.assets` undefined → same silent null. None of this is testable by the tautological suite.

### B9 — Presign route: image uploads stored with wrong Content-Type; duplicated validation constants — **CONFIRMED**
`CONTENT_TYPES` omits `png/jpg/jpeg/webp` → images land in R2 as `application/octet-stream` (affects serving/preview headers downstream). `ACCEPTED_EXTENSIONS` and `MAX_FILE_SIZE` are declared in the route **and** re-encoded inside `PresignRequestSchema` — two sources of truth that can drift (the route-level constants are now dead code). Tests check formats and the size message but not `contentType` for images, so the omission passes.

### B10 — Miscellany — CONFIRMED (code), untested
- `getRateLimitKey` trusts `x-forwarded-for` (spoofable off-platform) and buckets all header-less clients into one shared `'unknown'` key.
- `isNuminiaId` rejects uppercase hex; RFC 9562 treats UUIDs as case-insensitive on input.
- `createAssetMetadata` classifies storage by `url.includes('r2.')` — `https://example.com/r2.thing` misclassifies.
- `verifyCsrf` is length-then-compare (fine for fixed-length UUIDs; would leak length for variable tokens).

---

## C. Coverage gaps (what 173 green tests didn't look at)

- **6 of 37 API routes tested (~16%).** Untested: **`seasons/webhook` (Stripe — money + idempotency)**, `auth/thirdweb`, `admin/moderation/ban` (the feature *documented as broken* in the legacy docs — zero tests, no coincidence), `assets/[id]/direct-download`, `admin/upload`, `admin/users`, `characters`, `favorites`, `portals`, `health`, and 20 more.
- **~10 of ~40 lib modules tested.** Untested: `github-storage.ts` (the entire data layer — optimistic-locking 409 retry, cache invalidation), `resolveRank.ts` (rank composition over storage), `audit.ts`, `thirdweb-auth.ts`, `thirdweb-mint.ts`, `season-storage.ts`, `assetUrls.ts` (the Arweave→R2→GitHub resolution chain), `search.ts`, `i18n.tsx`.
- **No integration or e2e layer.** jsdom unit tests only; the CSRF+rank+rate-limit interaction on a real route is never exercised end-to-end.
- Pattern: tests exist where testing was *easy* (pure helpers), not where the *risk* was (auth verification, payments, concurrent storage, moderation).

---

## D. Lessons → binding rules for the rebuild's test strategy

1. **Anti-tautology rule.** A test file MUST import the module it names, and per-file coverage thresholds make a `hypParser.test.ts`-style decoy impossible. Never re-implement the logic under test inside the test.
2. **Coverage follows risk, not convenience.** Order for any phase: auth verification → money paths → storage concurrency → validators → helpers. The legacy suite inverted this.
3. **Never mock the boundary you claim to verify.** The rebuild's SIWE endpoint gets tests with *really signed and really tampered* payloads (test keys), including the misconfiguration case, before any happy-path test.
4. **Security must fail closed — and have a test proving it.** Direct consequence of B2: "env/config missing ⇒ 401/crash, never unverified fallback" becomes an explicit Gherkin scenario (it already aligns with MISSION-000's env-validation scenario).
5. **Hostile-input contract tests for every parser/validator**: oversized/negative lengths (B8), pooled `Buffer` vs `ArrayBuffer` (B3), uppercase UUIDs, no-extension filenames (A2), traversal attempts.
6. **Allowlists get bypass tests**, not membership tests: subdomain, substring, userinfo@host, and open-bucket cases (B4, B6). Classify URLs by parsed hostname only.
7. **Time-based logic uses fake timers** — a rate-limit suite that never proves recovery after the window is half a suite (A7).
8. **Test names are assertions.** If the name and the `expect` disagree (A2), the test is wrong even when green.
9. **One source of truth for validation constants** (B9): the Zod schema *is* the validation; no parallel constants in routes. In the rebuild: `packages/domain` validators only.
10. **Env hygiene in tests**: `beforeEach`/`afterEach` for every `process.env` mutation (A4); shared typed fixtures instead of twin suites drifting apart (A4-bis).
11. **No `console.*` even in error paths** — enforced by lint rule, not by intention (B8).
12. **A documented-broken feature with zero tests is the smell to hunt** (ban system, C): when a bug report exists, the regression test is written *first*, then the fix.

## E. Honest limitations

- The suite was **not executed** (would require installing dependencies into the condemned repo). Pass/fail status and the "173 tests" count are taken from the legacy docs; flakiness suspicions in A9 are unproven.
- Components (React/Three.js viewers) and pages were out of scope — the audit covered the test suite and the modules it touches.
- Nothing from this audit is to be copied into the rebuild. The value is the rules in §D and the vulnerability classes in §B, which inform `packages/auth`, the proxy design, and the MISSION-000 test scaffolding.
