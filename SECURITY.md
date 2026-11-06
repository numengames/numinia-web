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

## Known limitations (residual risk)

The site's Content-Security-Policy (`apps/store/public/_headers` for static
pages, `apps/store/src/middleware.ts` for the pages the Worker answers) is not
as strict as it could be. Two directives still allow inline code:

- `script-src 'unsafe-inline'` — the page's own inline scripts (Astro island
  bootstraps) are allowed, so a script injected into a page would not be
  stopped by the policy. A hash list does not work today: the Cloudflare build
  wraps each bootstrap in a shim that a hash computed in Node never sees, and
  one missed hash blocks every script, the sign-in included (tried and
  reverted on 2026-10-18). A per-request nonce is not possible on static
  pages, because `_headers` cannot generate one.
- `style-src 'unsafe-inline'` — about forty inline `style=""` attributes
  remain in the markup, and a hash does not cover attributes.

What holds the risk down meanwhile, and is checked by
`features/security-walls.feature`: `connect-src` is `'self' blob:` on every
page except the ones where a wallet signs (a script cannot send data to an
outside host with `fetch`), `default-src 'self'`, `object-src 'none'`,
`base-uri 'self'`, `form-action 'self'` and `frame-ancestors 'none'`.

The pages where a wallet signs (`/lap/session/`, `/lap/admin/worlds/`,
`/panel/miembros/`, `/panel/roles/`, in every locale) also open `connect-src`
to `https:` and `wss:`, because the user chooses their wallet's RPC host.

Closing the two inline allowances needs a hash step over the final Cloudflare
build output with an end-to-end sign-in test, and a rewrite of the inline
styles. It is tracked as MIS-269 and has not been decided yet. When either
allowance is removed, delete its line here: the same feature fails if the note
and the policy disagree.

## Reporting a vulnerability

Report privately through GitHub's *Report a vulnerability* on this
repository. Do not open a public issue.
