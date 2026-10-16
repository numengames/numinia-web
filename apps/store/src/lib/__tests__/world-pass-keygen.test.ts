/**
 * scripts/world-pass-keygen.mjs (cut 5): the key pair it writes is one the
 * signer accepts, the public document matches what the route would publish,
 * the private key is never printed, and a key that exists is never replaced.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PASS_TTL_SECONDS, publicKeyDocument, signPass, verifyPass } from '../world-pass';

const script = join(__dirname, '../../../../../scripts/world-pass-keygen.mjs');
const dir = mkdtempSync(join(process.env['TMPDIR'] ?? tmpdir(), 'keygen-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const run = (...args: string[]) => spawnSync('node', [script, ...args], { encoding: 'utf8' });

describe('world-pass-keygen', () => {
  it('writes a key pair the signer uses and the public document that goes with it', async () => {
    const path = join(dir, 'pass');
    const out = run(path);
    expect(out.status).toBe(0);
    const secret = readFileSync(`${path}.private`, 'utf8').trim();
    expect(out.stdout).not.toContain(secret);
    expect(out.stderr).toBe('');
    expect(statSync(`${path}.private`).mode & 0o777).toBe(0o600);
    const published = JSON.parse(readFileSync(`${path}.public.json`, 'utf8')) as {
      publicKey: string;
    };
    expect(published).toEqual(await publicKeyDocument(secret));
    const now = 1_800_000_000;
    const token = await signPass(secret, {
      v: 1,
      iss: 'numinia.com',
      aud: 'bosque',
      sub: 'p_00000000000000000000000000000000',
      org: 'acc',
      perm: ['enter-worlds'],
      height: 0,
      roles: [],
      iat: now,
      exp: now + PASS_TTL_SECONDS,
    });
    expect((await verifyPass(token, published.publicKey, { aud: 'bosque', now })).ok).toBe(true);
  });

  it('asks for a path and never replaces a key that exists', () => {
    expect(run().status).toBe(2);
    const path = join(dir, 'twice');
    expect(run(path).status).toBe(0);
    const before = readFileSync(`${path}.private`, 'utf8');
    const again = run(path);
    expect(again.status).toBe(1);
    expect(readFileSync(`${path}.private`, 'utf8')).toBe(before);
  });
});
