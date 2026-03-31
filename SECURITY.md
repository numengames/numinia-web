# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Numinia Digital Goods, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, email: **security@numinia.store**

Or DM on X: [@numinia_store](https://x.com/numinia_store)

## What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response timeline

- **Acknowledgment**: within 48 hours
- **Assessment**: within 1 week
- **Fix**: depends on severity (critical = same day, high = within 1 week)

## Scope

In scope:
- numinia.store web application
- API routes (`/api/*`)
- Authentication flows (SIWE, GitHub OAuth)
- Data integrity (github-storage, R2 uploads)

Out of scope:
- Third-party services (Vercel, Cloudflare, GitHub)
- The data repo content itself (CC0 public domain assets)

## Token Configuration

### GitHub Token (GITHUB_TOKEN)
Use a **fine-grained personal access token**, NOT a classic token:
1. Go to Settings → Developer settings → Fine-grained tokens
2. Repository access: **Only select repositories** → `numinia-digital-goods-data`
3. Permissions: **Contents** → Read and write
4. No other permissions needed

A classic token with `repo` scope gives access to ALL your repositories. A fine-grained token limits access to only the data repo.

### SESSION_SECRET
Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
Must be at least 32 characters. Used for HMAC-SHA256 cookie signing.

## Supported versions

Only the latest deployed version on [numinia.store](https://numinia.store) is supported.
