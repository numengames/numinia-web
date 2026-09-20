#!/usr/bin/env node
/**
 * build-cloudflare.mjs — the production build, in one command that lives in
 * the repository (wrangler.jsonc `build.command`), not in a panel.
 *
 * Workers Builds runs `npm ci` and then `npx wrangler deploy`; wrangler runs
 * THIS before uploading. Everything the retired GitHub workflow used to do
 * step by step, except the PDF/EPUB editions (they need Chromium, which the
 * Workers Builds image cannot install — see exports.yml).
 *
 *   1. env      — the build's variables, set here so no panel has to hold
 *                 them. All PUBLIC: the deploy target, the site URL, the
 *                 data repository. Nothing secret exists in this build.
 *   2. lore     — fetch the manual and the Codex matter from the archive
 *                 (numinia-archive lore/) and the Summa's entity cards
 *                 (objects/). Fails loud: a deploy must not ship
 *                 the synthetic fixture to citizens.
 *   3. build    — turbo builds the workspace packages, then the store.
 *   4. seal     — /version.json with the commit Workers Builds injects as
 *                 WORKERS_CI_COMMIT_SHA, so the live site can be checked
 *                 against main from outside.
 *
 * Local: `node scripts/build-cloudflare.mjs` reproduces production minus the
 * SHA ("dev"). CI (ci.yml) does NOT run this — it builds hermetically with
 * DATA_SOURCE=fixture and never touches the network.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const run = (cmd, env = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', env: { ...process.env, ...env } });
};

// 1. env — public values only; a secret here would be compiled into the bundle.
const env = {
  DEPLOY_TARGET: 'cloudflare',
  PUBLIC_SITE_URL: 'https://numinia.com',
  GITHUB_REPO_OWNER: 'PabloFMM',
  GITHUB_REPO_NAME: 'numinia-digital-goods-data',
  DATA_SOURCE: 'network',
};
if (!process.env.PUBLIC_THIRDWEB_CLIENT_ID) {
  console.error(
    'build-cloudflare: PUBLIC_THIRDWEB_CLIENT_ID is not set. It is a public client id (it ships in the HTML),\n' +
      '  set it as a build variable in the Worker (Settings → Builds → Variables). Without it the login island ships broken.',
  );
  process.exit(1);
}

// 2. lore
run('node scripts/fetch-lore.mjs');
// 2b. the Summa's entity cards (objects/catalogue.json + card bodies) —
// same two-source pattern; the legacy catalogue is untouched.
run('node scripts/fetch-summa.mjs');
// (the favicon set and the share card, STD-023 §19, are drawn by the
// store's own build script — apps/store/package.json — so every path that
// builds the store gets them: this one, CI's, and a plain `npm run build`.)

// 3. build
run('npx turbo run build --filter=@numinia/store', env);

// 4. seal
const sha = process.env.WORKERS_CI_COMMIT_SHA ?? 'dev';
const out = path.join('apps', 'store', 'dist', 'client');
mkdirSync(out, { recursive: true });
writeFileSync(
  path.join(out, 'version.json'),
  JSON.stringify({ commit: sha, builtAt: new Date().toISOString() }) + '\n',
);
console.log(`\nbuild-cloudflare: sealed ${sha.slice(0, 7)} → ${out}/version.json`);
