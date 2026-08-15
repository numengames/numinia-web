# Push-Day Runbook — creating the GitHub remote

> **For humans.** The push-day runbook: the exact ordered steps for creating the GitHub remote.
>
> **Epistemic value.** Resolves what must happen (and in what order) on the day the repo goes public.
> **Pragmatic value.** Push day executes this list top to bottom; deviations require Oracle sign-off.
> **In the system.** Observes: D11/D15 decisions. Regulates: the first push. Coupled to: docs/open-questions.md, SECURITY.md.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

> The exact ordered checklist for the day the Oracle decides to publish.
> Nothing here happens without that explicit order.

## Before the first push (decisions)

1. **License (D11)**: MIT vs AGPL-3.0 — decide, then update `LICENSE` file (create it!), constitution §, and every `package.json` `license` field if AGPL. _(Not legal advice; confirm with counsel.)_
2. **Repo name + visibility** (public/private first?) — Oracle.
3. Review `docs/reference/` and `docs/seminal/` for anything not meant to be public (seminal corpus publication is itself a decision — the RPG manual is unpublished IP).
4. Rotate/verify: no real tokens anywhere (`git log -p | secretlint` spot check already covered by hooks going forward).

## The push

5. `git remote add origin <url>` && `git push -u origin main`.
6. Verify **CI goes green on `main`** (three jobs) — this closes the last open MISSION-000 criterion.

## Immediately after

7. Branch protection on `main`: require PRs for `com` paths, require the three CI checks, no force pushes.
8. Update `CODEOWNERS` handles; enable Renovate (config already committed); enable Dependabot alerts.
9. Repository secrets: none needed yet (CI is hermetic). Add only when deploy day comes (D3-bis).
10. `SECURITY.md`: fill the public contact + disclosure window.
11. Decide analytics backend + consent banner (D12) — required before any deploy, not before the push.
12. Visual regression baselines (`apps/store/e2e/visual.spec.ts`) are skipped on CI: regenerate them inside the CI image (`CI= npx playwright test visual --update-snapshots` on the runner or its Docker image), commit, then remove the `test.skip(!!process.env.CI, …)` guard.

## Explicitly still forbidden after the push

- Deploys (Vercel/Cloudflare) until the Oracle orders them (D3-bis).
- npm publication of any `@numinia/*` package.
