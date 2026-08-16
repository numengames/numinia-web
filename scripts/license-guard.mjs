// License guard (ADR-019 / LEGAL_DEBT DEBT-001): the ConsenSys-licensed
// MetaMask SDK may exist in node_modules (transitive via thirdweb) but must
// NEVER be distributed — its notice-propagating restrictions are incompatible
// with the AGPL-3.0-only apps. Greps built output for the copyright strings
// themselves (bundlers inline code; package names would not survive).
// Exit 1 the moment any marker ships. That is the debt's exit trigger.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST_ROOTS = ['apps/store/dist', 'apps/com/dist'];
const MARKERS = ['ConsenSys Software Inc.', 'metamask.license@consensys.net'];
const EXTENSIONS = /\.(m?js|cjs|html)$/;

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return; // dist not built for this app — nothing shipped, nothing to guard
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.test(entry)) yield path;
  }
}

const hits = [];
let scanned = 0;
for (const root of DIST_ROOTS) {
  for (const file of walk(root)) {
    scanned += 1;
    const content = readFileSync(file, 'utf8');
    for (const marker of MARKERS) {
      if (content.includes(marker)) hits.push({ file, marker });
    }
  }
}

if (hits.length > 0) {
  console.error('LICENSE GUARD FAILED — ConsenSys-licensed code is being distributed:');
  for (const { file, marker } of hits) console.error(`  ${file} ← "${marker}"`);
  console.error('This is the DEBT-001 exit trigger (docs/LEGAL_DEBT.md): the MetaMask');
  console.error('SDK connector must now be removed (EIP-6963 + WalletConnect path).');
  process.exit(1);
}

console.log(`license-guard: ${scanned} built files scanned, no ConsenSys markers. Clean.`);
