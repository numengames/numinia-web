/**
 * Data doctor — read-only health audit of the public data repo.
 *
 * Validates every catalog record against the domain schema (collecting, not
 * fail-fast), checks id uniqueness, and HEAD-checks binary/thumbnail URLs.
 * Emits a markdown report to docs/reference/data-doctor-report.md.
 *
 * Usage: node scripts/data-doctor.mjs [--skip-urls]
 */
import { writeFile } from 'node:fs/promises';
import { parseAssetRecord } from '@numinia/domain';

const OWNER = 'PabloFMM';
const REPO = 'numinia-digital-goods-data';
const BRANCH = 'main';
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;

const CATALOGS = [
  ['models', 'data/assets/numinia-assets.json'],
  ['avatars', 'data/avatars/numinia-avatars.json'],
  ['worlds', 'data/worlds/numinia-worlds.json'],
  ['audio', 'data/audio/numinia-audio.json'],
  ['video', 'data/video/numinia-video.json'],
  ['images', 'data/images/numinia-images.json'],
  ['3dprint', 'data/3dprint/numinia-3dprint.json'],
];

const skipUrls = process.argv.includes('--skip-urls');

async function fetchJson(path) {
  const res = await fetch(`${RAW}/${path}`);
  if (!res.ok) return { error: `HTTP ${res.status}` };
  try {
    return { data: await res.json() };
  } catch {
    return { error: 'invalid JSON' };
  }
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    // Some hosts reject HEAD; retry with a ranged GET before declaring it dead.
    if (res.status === 405 || res.status === 403) {
      const get = await fetch(url, {
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(15000),
      });
      return get.ok || get.status === 206;
    }
    return res.ok;
  } catch {
    return false;
  }
}

const report = [];
const summary = [];
const allIds = new Map();
const urlChecks = [];

for (const [name, path] of CATALOGS) {
  const { data, error } = await fetchJson(path);
  if (error) {
    summary.push(`| ${name} | — | ❌ ${error} | — | — |`);
    continue;
  }
  if (!Array.isArray(data)) {
    summary.push(`| ${name} | — | ❌ not an array | — | — |`);
    continue;
  }
  const invalid = [];
  let valid = 0;
  for (const [index, record] of data.entries()) {
    try {
      const asset = parseAssetRecord(record);
      valid += 1;
      const seenIn = allIds.get(asset.id);
      if (seenIn) {
        invalid.push(`duplicate id \`${asset.id}\` (also in ${seenIn})`);
      } else {
        allIds.set(asset.id, name);
      }
      if (!skipUrls) {
        if (asset.modelFileUrl)
          urlChecks.push({ name, id: asset.id, kind: 'file', url: asset.modelFileUrl });
        if (asset.thumbnailUrl)
          urlChecks.push({ name, id: asset.id, kind: 'thumb', url: asset.thumbnailUrl });
      }
    } catch (err) {
      const id = record && typeof record === 'object' && 'id' in record ? record.id : `#${index}`;
      invalid.push(`\`${id}\`: ${String(err.message ?? err).split('\n')[0]}`);
    }
  }
  summary.push(
    `| ${name} | ${data.length} | ${invalid.length === 0 ? '✅' : `⚠️ ${invalid.length} invalid`} | ${valid} | ${data.length - valid} |`,
  );
  if (invalid.length > 0) {
    report.push(`### ${name} — schema findings\n`);
    for (const line of invalid) report.push(`- ${line}`);
    report.push('');
  }
}

let deadUrls = [];
if (!skipUrls) {
  const queue = [...urlChecks];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      if (!(await headOk(item.url))) deadUrls.push(item);
    }
  });
  await Promise.all(workers);
}

const lines = [
  '# Data Doctor Report — numinia-digital-goods-data',
  '',
  `> Generated ${new Date().toISOString()} by \`scripts/data-doctor.mjs\` (read-only).`,
  `> Validation schema: \`@numinia/domain\` asset validator (the one Phase 1 migration will use).`,
  '',
  '## Catalog summary',
  '',
  '| Catalog | Records | Status | Valid | Invalid |',
  '|---|---:|---|---:|---:|',
  ...summary,
  '',
  ...report,
  '## URL health',
  '',
  skipUrls
    ? '_Skipped (--skip-urls)._'
    : deadUrls.length === 0
      ? `✅ All ${urlChecks.length} referenced URLs respond (files + thumbnails).`
      : `⚠️ ${deadUrls.length} of ${urlChecks.length} URLs are unreachable:\n\n${deadUrls
          .map((d) => `- [${d.name}] \`${d.id}\` ${d.kind}: ${d.url}`)
          .join('\n')}`,
  '',
];

await writeFile('docs/reference/data-doctor-report.md', lines.join('\n'), 'utf8');
process.stdout.write(
  `data-doctor: ${allIds.size} unique assets, ${deadUrls.length} dead URLs — report written\n`,
);
