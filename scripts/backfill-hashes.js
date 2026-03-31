/**
 * Backfill file_hash for all assets that have file_hash: null.
 * Downloads each asset binary, computes SHA-256, updates the JSON.
 *
 * Usage: node scripts/backfill-hashes.js
 * Requires: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME in .env.local
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = process.env.GITHUB_REPO_OWNER;
const REPO = process.env.GITHUB_REPO_NAME;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

if (!TOKEN || !OWNER || !REPO) {
  console.error('Missing GITHUB_TOKEN, GITHUB_REPO_OWNER, or GITHUB_REPO_NAME');
  process.exit(1);
}

const API = 'https://api.github.com';
const headers = { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' };

async function fetchJSON(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function getFileContent(filePath) {
  const data = await fetchJSON(`${API}/repos/${OWNER}/${REPO}/contents/${filePath}`);
  return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha: data.sha };
}

async function updateFile(filePath, content, sha, message) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), sha, branch: BRANCH }),
  });
  if (!res.ok) throw new Error(`Update failed: ${res.status}`);
}

async function computeHash(url) {
  console.log(`  Downloading ${url.slice(0, 80)}...`);
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  return `sha256:${crypto.createHash('sha256').update(buffer).digest('hex')}`;
}

async function main() {
  const catalogs = [
    'data/assets/numinia-assets.json',
    'data/avatars/numinia-avatars.json',
    'data/worlds/numinia-worlds.json',
    'data/audio/numinia-audio.json',
    'data/video/numinia-video.json',
    'data/images/numinia-images.json',
  ];

  let totalUpdated = 0;

  for (const catalog of catalogs) {
    console.log(`\nProcessing ${catalog}...`);
    let fileData;
    try {
      fileData = await getFileContent(catalog);
    } catch (e) {
      console.log(`  Skipping (${e.message})`);
      continue;
    }

    const assets = JSON.parse(fileData.content);
    let changed = false;

    for (const asset of assets) {
      if (asset.file_hash) continue;

      const url = asset.model_file_url || asset.modelFileUrl;
      if (!url) continue;

      const hash = await computeHash(url);
      if (hash) {
        asset.file_hash = hash;
        changed = true;
        totalUpdated++;
        console.log(`  ${asset.name || asset.id}: ${hash}`);
      } else {
        console.log(`  ${asset.name || asset.id}: FAILED to download`);
      }
    }

    if (changed) {
      const newContent = JSON.stringify(assets, null, 2);
      await updateFile(catalog, newContent, fileData.sha, `backfill: add file_hash to ${totalUpdated} assets`);
      console.log(`  Updated ${catalog}`);
    }
  }

  console.log(`\nDone! ${totalUpdated} assets updated.`);
}

main().catch(e => { console.error(e); process.exit(1); });
