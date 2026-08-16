// License guard (ADR-019 / LEGAL_DEBT DEBT-001): the ConsenSys-licensed
// MetaMask SDK may exist in node_modules (transitive via thirdweb) but must
// NEVER be distributed — its notice-propagating restrictions are incompatible
// with the AGPL-3.0-only apps.
//
// Primary source: dist/.license-modules.json, written at build time by
// scripts/vite-license-manifest.mjs — the bundler's own module list. Strings
// cannot be trusted alone (minifiers strip license comments), so the string
// sweep below is only a second net, never the proof.
//
// The same manifest drives the Apache-2.0 audit: any Apache module in a
// CLIENT bucket requires NOTICE at the repo root, and any bundled package
// without a declared license field fails (canon C-005 consume rule).

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APPS = ['apps/store', 'apps/com'];
const FORBIDDEN_PACKAGES = [
  '@metamask/sdk',
  '@metamask/sdk-communication-layer',
  '@metamask/sdk-install-modal-web',
];
const STRING_MARKERS = ['ConsenSys Software Inc.', 'metamask.license@consensys.net'];
const EXTENSIONS = /\.(m?js|cjs|html)$/;
// Registry-declared licenses whose tarballs omit the field (kept in sync with
// scripts/license-clarifications.json — the gate's clarification file).
const CLARIFICATIONS = JSON.parse(
  readFileSync(new URL('./license-clarifications.json', import.meta.url), 'utf8'),
);

const failures = [];

/** node_modules/… module id → package name (scope-aware). */
function packageOf(moduleId) {
  const tail = moduleId.slice(moduleId.lastIndexOf('node_modules/') + 'node_modules/'.length);
  const parts = tail.split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

/** Package root path for a module id (nearest enclosing package). */
function packageRootOf(moduleId) {
  const cut = moduleId.lastIndexOf('node_modules/');
  return join(moduleId.slice(0, cut), 'node_modules', packageOf(moduleId));
}

// ── Primary: the bundler's module manifest ───────────────────────────────────
let manifestsSeen = 0;
const apacheInClient = new Set();

for (const app of APPS) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(app, 'dist', '.license-modules.json'), 'utf8'));
  } catch {
    continue; // app not built in this run — its dist ships nothing to guard
  }
  manifestsSeen += 1;

  for (const [bucket, modules] of Object.entries(manifest)) {
    const isClient = !/(^|\/)(server|_worker)/.test(bucket);
    for (const moduleId of modules) {
      const pkg = packageOf(moduleId);

      if (FORBIDDEN_PACKAGES.includes(pkg)) {
        failures.push(`${app} [${bucket}] bundles forbidden package ${pkg} (${moduleId})`);
        continue;
      }

      let license;
      try {
        const meta = JSON.parse(
          readFileSync(join(packageRootOf(moduleId), 'package.json'), 'utf8'),
        );
        license = meta.license ?? CLARIFICATIONS[`${meta.name}@${meta.version}`]?.licenses;
      } catch {
        license = undefined;
      }
      if (license === undefined) {
        failures.push(`${app} [${bucket}] bundles ${pkg} with NO declared license field`);
      } else if (isClient && /Apache-2\.0/i.test(String(license))) {
        apacheInClient.add(pkg);
      }
    }
  }
}

if (manifestsSeen === 0) {
  console.error('LICENSE GUARD FAILED — no dist/.license-modules.json found in any app.');
  console.error('The build must run scripts/vite-license-manifest.mjs; a guard with no');
  console.error('manifest proves nothing (string scans miss minified code).');
  process.exit(1);
}

// Apache-2.0 in a client bucket is legal but demands NOTICE (canon skeleton).
if (apacheInClient.size > 0) {
  let notice = '';
  try {
    notice = readFileSync('NOTICE', 'utf8');
  } catch {
    failures.push(
      `Apache-2.0 code ships in the client bundle (${[...apacheInClient].join(', ')}) but NOTICE does not exist at the repo root.`,
    );
  }
  for (const pkg of apacheInClient) {
    if (notice && !notice.includes(pkg)) {
      failures.push(`NOTICE exists but does not mention shipped Apache-2.0 package ${pkg}.`);
    }
  }
}

// ── Second net: string sweep of built output (belt and braces) ───────────────
function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.test(entry)) yield path;
  }
}

let scanned = 0;
for (const app of APPS) {
  for (const file of walk(join(app, 'dist'))) {
    scanned += 1;
    const content = readFileSync(file, 'utf8');
    for (const marker of STRING_MARKERS) {
      if (content.includes(marker)) failures.push(`${file} contains string marker "${marker}"`);
    }
  }
}

if (failures.length > 0) {
  console.error('LICENSE GUARD FAILED:');
  for (const failure of [...new Set(failures)]) console.error(`  - ${failure}`);
  console.error('If a ConsenSys/MetaMask finding fired, that is the DEBT-001 exit trigger');
  console.error('(docs → LEGAL_DEBT.md): remove the MetaMask SDK connector (EIP-6963 +');
  console.error('WalletConnect path). For Apache findings, write or update NOTICE.');
  process.exit(1);
}

console.log(
  `license-guard: ${manifestsSeen} module manifest(s) audited (forbidden/Apache/no-license), ` +
    `${scanned} built files string-swept. Clean.`,
);
