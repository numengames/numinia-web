# Definition of Done — Numinia Standard v0.2.0

> **For humans.** The definition of done: the checklist every mission must satisfy before it may close.
>
> **Epistemic value.** Resolves whether work is actually finished versus merely stopped.
> **Pragmatic value.** No mission closes without passing every applicable line; partial completion is reported as such.
> **In the system.** Observes: mission reports. Regulates: closure. Coupled to: missions/*, CONTRIBUTING.md.
>
> _Part of the Law. Index: [docs/LEY.md](../docs/LEY.md)_

> Referenced by every mission (Mission_Template_v0_2_0.md). A mission is Done
> only when every applicable item holds — "almost ready" is not a state.

## Code

- [ ] Tests written BEFORE implementation (Rule 3); unit tests green.
- [ ] `packages/*`: 100% statement coverage per file; no decoy tests (suite imports the module it names).
- [ ] `npm run verify` green (pipeline + acceptance + licenses + e2e).
- [ ] No `any`, no `console.*`, components ≤ 200 lines, named exports only.
- [ ] Every interactive element carries `data-metric` (docs/analytics.md).
- [ ] External data validated with Zod; env vars fail closed at boot.

## Documentation & governance

- [ ] Acceptance criteria exist as Gherkin and pass against real artifacts.
- [ ] Autonomous architectural decisions recorded as ADRs (Peirce format).
- [ ] Glossary updated FIRST if any domain term changed (ADR-012).
- [ ] README/docs updated where behavior changed.
- [ ] Completion report includes what was NOT done (Rule 8).

## Review & traceability

- [ ] Atomic commits, `[track] type(scope): description` (hook-enforced).
- [ ] Code review approved (PR mandatory for `com` once the remote exists).
- [ ] TODO.md / open-questions.md updated; Learning Outcome filled if epistemic.

## Deliberately NOT in this DoD (until the Oracle lifts the orders)

- Deploys of any kind; publication to GitHub/npm; analytics vendors (D3-bis, D11, D12).
