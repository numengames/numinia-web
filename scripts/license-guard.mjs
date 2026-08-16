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
// Severity follows EXPOSURE, not directory names (ADR-019 calibration,
// Oracle-signed 2026-08-16): the app the deploy config actually ships gets
// errors; an undeployed app gets warnings; an undeterminable deploy config
// fails closed — everything is an error, same as a missing manifest.
// Exception: the ConsenSys forbidden packages are an error EVERYWHERE — their
// trigger is not exposure but the AGPL-uncompliable state, which exists the
// moment the code enters a bundle, whether anyone serves it or not.

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

/**
 * Which apps does the deploy configuration actually ship? Derived from
 * wrangler.jsonc's `main` / assets `directory` paths — never a hand-written
 * map, which would lie again the day the platform moves. Returns null when
 * the answer cannot be determined (caller must fail closed).
 */
function productionApps() {
  let raw;
  try {
    raw = readFileSync('wrangler.jsonc', 'utf8');
  } catch {
    return null;
  }
  const refs = [...raw.matchAll(/"(?:main|directory)"\s*:\s*"(apps\/[^/"]+)/g)].map((m) => m[1]);
  return refs.length > 0 ? [...new Set(refs)] : null;
}

const errors = [];
const warnings = [];
const deployed = productionApps();
if (deployed === null) {
  errors.push(
    'Deploy target undeterminable from wrangler.jsonc — failing closed: every app is treated as production.',
  );
}
const isProduction = (app) => deployed === null || deployed.includes(app);
/** Route a finding by exposure; `always` forces error regardless of deploy. */
function report(app, message, { always = false } = {}) {
  (always || isProduction(app) ? errors : warnings).push(message);
}

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
const apacheInClient = []; // {pkg, app}

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
        // Error in every app: the uncompliable AGPL state exists the moment
        // this enters a bundle, served or not (DEBT-001 exit trigger).
        report(app, `${app} [${bucket}] bundles forbidden package ${pkg} (${moduleId})`, {
          always: true,
        });
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
        report(app, `${app} [${bucket}] bundles ${pkg} with NO declared license field`);
      } else if (isClient && /Apache-2\.0/i.test(String(license))) {
        apacheInClient.push({ pkg, app });
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
if (apacheInClient.length > 0) {
  let notice = '';
  try {
    notice = readFileSync('NOTICE', 'utf8');
  } catch {
    for (const { pkg, app } of apacheInClient) {
      report(
        app,
        `${app} ships Apache-2.0 package ${pkg} in the client bundle but NOTICE does not exist at the repo root.`,
      );
    }
  }
  if (notice) {
    for (const { pkg, app } of apacheInClient) {
      if (!notice.includes(pkg)) {
        report(
          app,
          `NOTICE exists but does not mention Apache-2.0 package ${pkg} shipped by ${app}.`,
        );
      }
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
      // ConsenSys markers are error everywhere, same as the module check.
      if (content.includes(marker)) {
        report(app, `${file} contains string marker "${marker}"`, { always: true });
      }
    }
  }
}

for (const warning of [...new Set(warnings)]) console.warn(`LICENSE GUARD WARNING: ${warning}`);

if (errors.length > 0) {
  console.error('LICENSE GUARD FAILED:');
  for (const failure of [...new Set(errors)]) console.error(`  - ${failure}`);
  console.error('If a ConsenSys/MetaMask finding fired, that is the DEBT-001 exit trigger');
  console.error('(docs → LEGAL_DEBT.md): remove the MetaMask SDK connector (EIP-6963 +');
  console.error('WalletConnect path). For Apache findings, write or update NOTICE.');
  process.exit(1);
}

console.log(
  `license-guard: ${manifestsSeen} module manifest(s) audited (forbidden/Apache/no-license), ` +
    `${scanned} built files string-swept, production=${deployed === null ? 'UNDETERMINED' : deployed.join(',')}. ` +
    `${warnings.length} warning(s), 0 errors. Clean.`,
);
