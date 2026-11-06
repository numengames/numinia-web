/**
 * The Content-Security-Policy lives in TWO places that must say the same
 * thing: `src/middleware.ts` (SSR responses) and `public/_headers` (static
 * pages, served by the assets layer before the Worker). MIS-269 closed the
 * open `connect-src https:` on the public pages; this test keeps that gain
 * and keeps the two copies from drifting apart.
 *
 * It checks the policy as written in the two files — it does not prove what
 * the browser receives (that is `curl -I` against the live site) and it does
 * not close the two known residual risks: `script-src 'unsafe-inline'` and
 * `style-src 'unsafe-inline'`. It RATCHETS them: nothing may be added to
 * those two directives, so the day a step removes `'unsafe-inline'` the
 * expectations below are tightened in the same pull request.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const middleware = read('../../middleware.ts');
const headersFile = read('../../../public/_headers');

/** The strict policy, read from the string literals of CSP_STRICT. */
function strictFromMiddleware(): string {
  const block = /const CSP_STRICT = \[([\s\S]*?)\]\.join\('; '\)/.exec(middleware);
  if (block === null) throw new Error('CSP_STRICT not found in middleware.ts');
  const parts = [...(block[1] ?? '').matchAll(/"([^"]*)"/g)].map((m) => m[1] ?? '');
  return parts.join('; ');
}

interface Rule {
  path: string;
  detaches: boolean;
  csp: string | null;
}

/** `_headers`: unindented line = path, indented lines = its headers. */
function parseHeaders(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split('\n')) {
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    if (!raw.startsWith(' ')) {
      rules.push({ path: raw.trim(), detaches: false, csp: null });
      continue;
    }
    const rule = rules.at(-1);
    if (rule === undefined) throw new Error('_headers: an indented line before any path');
    const line = raw.trim();
    if (line === '! Content-Security-Policy') rule.detaches = true;
    else if (line.startsWith('Content-Security-Policy:')) {
      rule.csp = line.slice('Content-Security-Policy:'.length).trim();
    }
  }
  return rules;
}

const directives = (csp: string): Map<string, string[]> =>
  new Map(
    csp.split(';').map((d) => {
      const [name = '', ...sources] = d.trim().split(/\s+/);
      return [name, sources] as [string, string[]];
    }),
  );

const STRICT = strictFromMiddleware();
const SESSION_CONNECT = "connect-src 'self' blob: https: wss:";
const SESSION = STRICT.replace("connect-src 'self' blob:", SESSION_CONNECT) + '; frame-src https:';
const rules = parseHeaders(headersFile);
const global = rules.find((r) => r.path === '/*');

const LOCALES = ['', '/es', '/ja', '/ko', '/pt-br'];
const SESSION_STEMS = ['/lap/session', '/lap/admin/worlds', '/panel/roles', '/panel/miembros'];
const EXPECTED_RELAXED = LOCALES.flatMap((l) => SESSION_STEMS.map((s) => `${l}${s}/*`));
// A retired page (MIS-078) whose rule outlived it. Harmless — no page answers
// there — but stale; remove it in a later pull request and drop it from here.
const KNOWN_STALE = ['/spike/auth'];

describe('CSP: the strict policy', () => {
  const d = directives(STRICT);

  it('keeps connect-src closed to the origin and blob: (MIS-269)', () => {
    expect(d.get('connect-src')).toEqual(["'self'", 'blob:']);
  });

  it('allows no wildcard, http: or https: source in the fetching directives', () => {
    for (const name of ['default-src', 'script-src', 'style-src', 'connect-src', 'object-src']) {
      for (const source of d.get(name) ?? []) {
        expect(['*', 'http:', 'https:', 'wss:']).not.toContain(source);
      }
    }
  });

  it("ratchets script-src and style-src: only 'self' and 'unsafe-inline' (residual E and F)", () => {
    expect(d.get('script-src')).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it('forbids framing, plugins and base-tag injection', () => {
    expect(d.get('frame-ancestors')).toEqual(["'none'"]);
    expect(d.get('object-src')).toEqual(["'none'"]);
    expect(d.get('base-uri')).toEqual(["'self'"]);
  });
});

describe('CSP: middleware.ts and public/_headers say the same', () => {
  it('the static default (/*) equals the SSR strict policy', () => {
    expect(global?.csp).toBe(STRICT);
  });

  it('the relaxed policy in middleware.ts is the strict one plus the wallet allowance', () => {
    expect(middleware).toContain(`"${SESSION_CONNECT}"`);
    expect(middleware).toContain("'; frame-src https:'");
  });

  it('exactly the wallet-signing pages are relaxed in _headers, each detaching the default', () => {
    const relaxed = rules.filter((r) => r.csp !== null && r.path !== '/*');
    const paths = relaxed.map((r) => r.path).filter((p) => !KNOWN_STALE.includes(p));
    expect(paths.sort()).toEqual([...EXPECTED_RELAXED].sort());
    for (const rule of relaxed) {
      // Without the `!`, the browser would enforce the global CSP too and the
      // strictest one wins (the worlds room broke that way on 2026-10-18).
      expect(rule.detaches, `${rule.path} must detach the global CSP`).toBe(true);
      expect(rule.csp).toBe(SESSION);
    }
  });

  it('the middleware recognises the same page stems as _headers relaxes', () => {
    expect(middleware).toContain('lap\\/(session|admin\\/worlds)|panel\\/(miembros|roles)');
  });
});
