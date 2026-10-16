#!/usr/bin/env node
/**
 * Makes the Ed25519 key pair that signs world passes («Entrar»; contract in
 * apps/store/src/lib/world-pass.ts).
 *
 *   node scripts/world-pass-keygen.mjs <path>
 *
 * writes `<path>.private` (the private key, PKCS8 DER in base64 — the value of
 * the Worker secret WORLD_PASS_PRIVATE_KEY; mode 0600) and `<path>.public.json`
 * (`{ alg, kid, publicKey }`, what GET /.well-known/world-pass-key.json
 * answers). It never prints the private key and never overwrites a file.
 * Then, on Cloudflare:
 *
 *   npx wrangler secret put WORLD_PASS_PRIVATE_KEY   # paste the .private file's content
 */

import { Buffer } from 'node:buffer';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const target = process.argv[2];
if (target === undefined || target === '') {
  process.stderr.write('usage: node scripts/world-pass-keygen.mjs <path>\n');
  process.exit(2);
}

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const publicRaw = Buffer.from(publicKey.export({ format: 'jwk' }).x, 'base64url');
const document = {
  alg: 'Ed25519',
  kid: createHash('sha256').update(publicRaw).digest('hex').slice(0, 8),
  publicKey: publicRaw.toString('base64url'),
};

try {
  // `wx`: a key that exists is never replaced.
  writeFileSync(
    `${target}.private`,
    `${privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64')}\n`,
    { flag: 'wx', mode: 0o600 },
  );
  writeFileSync(`${target}.public.json`, `${JSON.stringify(document, null, 2)}\n`, { flag: 'wx' });
} catch (error) {
  process.stderr.write(`world-pass-keygen: ${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
}
process.stdout.write(`kid ${document.kid}: wrote ${target}.private and ${target}.public.json\n`);
