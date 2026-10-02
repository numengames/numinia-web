/**
 * Storage inventory (LEG-003 §3.1): every key the site's own code stores —
 * localStorage/sessionStorage keys, `…KEY… = '…'` constants, cookies set by
 * the API and the consent cookie — must be named in STORED_KEYS AND in the
 * numinia.com section of the published cookie policy. A new key that the
 * policy does not name fails here, before it ships.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONSENT_COOKIE, STORED_KEYS } from '../consent';

const SRC = fileURLToPath(new URL('../../', import.meta.url));

function sources(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__' && name !== 'content') found.push(...sources(full));
    } else if (/\.(ts|tsx|astro|js|mjs)$/.test(name)) found.push(full);
  }
  return found;
}

const PATTERNS = [
  /(?:localStorage|sessionStorage)\.setItem\(\s*['"`]([^'"`]+)['"`]/g,
  /const\s+\w*KEY\w*\s*=\s*['"`]([^'"`]+)['"`]/g,
  /const\s+\w*_COOKIE\s*=\s*['"`]([^'"`]+)['"`]/g,
];

function scannedKeys(): Set<string> {
  const keys = new Set<string>([CONSENT_COOKIE]);
  for (const file of sources(SRC)) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of PATTERNS) {
      for (const match of text.matchAll(pattern)) keys.add(match[1] as string);
    }
  }
  return keys;
}

/** The numinia.com section (§3.1) of the published policy copy. */
function policySection(): string {
  const policy = readFileSync(join(SRC, 'content/legal/cookies.md'), 'utf8');
  const start = policy.indexOf('### 3.1 numinia.com');
  const end = policy.indexOf('### 3.2', start);
  expect(start, 'LEG-003 lost its numinia.com section').toBeGreaterThan(-1);
  return policy.slice(start, end);
}

describe('storage inventory', () => {
  const keys = scannedKeys();
  const section = policySection();

  it('finds the keys the site is known to store (the scan works)', () => {
    for (const known of ['numinia-modo', 'numinia-lap-personaje', 'numinia_session']) {
      expect(keys).toContain(known);
    }
  });

  it.each([...scannedKeys()].sort())('%s is named by STORED_KEYS and LEG-003 §3.1', (key) => {
    expect(STORED_KEYS as readonly string[]).toContain(key);
    expect(section).toContain(`\`${key}\``);
  });

  it.each([...STORED_KEYS])('%s in STORED_KEYS is named by LEG-003 §3.1', (key) => {
    expect(section).toContain(`\`${key}\``);
  });

  /* A key the code no longer writes must leave STORED_KEYS too: the list
     describes what the site stores today, not what it once did. */
  it.each([...STORED_KEYS])('%s in STORED_KEYS is still stored by the code', (key) => {
    expect(keys).toContain(key);
  });
});

/* One door issues the session: api/auth/login.ts, with the signed token
   (lib/auth/server.ts issueSession). The retired SIWE spike wrote the raw
   wallet address into the same cookie, which signed a real citizen out. */
describe('the session cookie', () => {
  const API = join(SRC, 'pages/api');

  it('is issued only by the real login', () => {
    const issuers = sources(API)
      .filter((file) => {
        const text = readFileSync(file, 'utf8');
        return /cookies\.set\(\s*SESSION_COOKIE\b/.test(text) || text.includes("'numinia_session'");
      })
      .map((file) => file.slice(API.length + 1));
    expect(issuers).toEqual(['auth/login.ts']);
  });
});
