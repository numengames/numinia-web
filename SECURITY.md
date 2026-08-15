# Security Policy

## Principles (commitments, not aspirations)

- **Fail closed.** Missing configuration crashes at boot naming the variable;
  no auth path ever degrades to unverified trust (lesson B1/B2 of the legacy
  audit — those classes of bug are design-forbidden here).
- **No PII in telemetry.** Wallet addresses are never analytics props;
  referrers are reduced to hosts; undeclared props are rejected at runtime.
- **No secrets in git.** A secret scanner runs on every commit (pre-commit
  hook) and `.env*` is ignored. If a secret ever lands: rotate it immediately,
  then rewrite history before any push.
- **Validated boundaries.** All external data (env, data-repo JSON, request
  bodies) passes Zod validation; URL classification parses hostnames, never
  substrings.
- **Supply chain.** `npm ci` only; production audit blocking at high; strong
  copyleft blocked by the license gate; actions pinned to SHA.

## Reporting a vulnerability

Until the public repository exists, report directly to the Numen Games team
(Pablo — Oracle). After publication this section will carry a contact address
and a disclosure window commitment.
