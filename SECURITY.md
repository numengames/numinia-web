# Security Policy

## Commitments

- **Fail closed.** Missing configuration crashes at boot naming the
  variable; no auth path degrades to unverified trust.
- **No PII in telemetry.** Wallet addresses are never analytics props;
  referrers are reduced to hosts; undeclared props are rejected at runtime.
- **No secrets in git.** A secret scanner runs on every commit and `.env*`
  is ignored. If one lands: rotate first, then rewrite history before any
  push.
- **Validated boundaries.** External data (env, data-repo JSON, request
  bodies) passes Zod validation; URL classification parses hostnames.
- **Supply chain.** `npm ci` only; strong copyleft and the ConsenSys
  MetaMask SDK blocked from `dist/` by the licence gate; actions pinned.

## Reporting a vulnerability

Report privately through GitHub's *Report a vulnerability* on this
repository. Do not open a public issue.
