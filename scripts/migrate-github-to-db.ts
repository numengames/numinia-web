#!/usr/bin/env npx tsx
/**
 * Migration script: GitHub JSON → Neon PostgreSQL
 *
 * Reads all data from the GitHub data repo (via github-storage.ts)
 * and inserts it into the PostgreSQL database (via Drizzle ORM).
 *
 * Idempotent: uses ON CONFLICT DO NOTHING, safe to re-run.
 *
 * Prerequisites:
 *   - DATABASE_URL set in .env.local (Neon connection string)
 *   - GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME set
 *   - Database tables created: npx drizzle-kit push
 *
 * Usage:
 *   npx tsx scripts/migrate-github-to-db.ts
 *
 * This script is part of the Phase 2 enterprise migration.
 * See CLAUDE.md "Enterprise migration" section for context.
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema';

// These use process.env directly since we're outside the Next.js runtime
const DATABASE_URL = process.env.DATABASE_URL;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO_NAME;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

if (!DATABASE_URL) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
if (!GITHUB_TOKEN) { console.error('❌ GITHUB_TOKEN not set'); process.exit(1); }
if (!GITHUB_OWNER) { console.error('❌ GITHUB_REPO_OWNER not set'); process.exit(1); }
if (!GITHUB_REPO) { console.error('❌ GITHUB_REPO_NAME not set'); process.exit(1); }

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

const RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

/* ────────────────────────── helpers ────────────────────────── */

async function fetchGitHub<T>(path: string): Promise<T> {
  const res = await fetch(`${RAW_BASE}/${path}?t=${Date.now()}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}` },
  });
  if (res.status === 404) return [] as unknown as T;
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${path}`);
  return res.json();
}

function log(emoji: string, msg: string) {
  console.log(`${emoji}  ${msg}`);
}

function toDate(iso: string | undefined | null): Date {
  return iso ? new Date(iso) : new Date();
}

/* ────────────────────────── migrate functions ────────────────────────── */

async function migrateProjects() {
  const projects = await fetchGitHub<Record<string, unknown>[]>('data/projects.json');
  if (!projects?.length) { log('⚠️', 'No projects found'); return 0; }

  let count = 0;
  for (const p of projects) {
    try {
      await db.insert(schema.projects).values({
        id: String(p.id),
        name: String(p.name || ''),
        creatorId: p.creator_id ? String(p.creator_id) : null,
        description: p.description ? String(p.description) : null,
        isPublic: p.is_public !== false,
        license: String(p.license || 'CC0'),
        sourceType: p.source_type ? String(p.source_type) : null,
        assetDataFile: (p.asset_data_file || p.assetDataFile) ? String(p.asset_data_file || p.assetDataFile) : null,
        createdAt: toDate(p.created_at as string),
        updatedAt: toDate(p.updated_at as string),
      }).onConflictDoNothing();
      count++;
    } catch (err) {
      log('⚠️', `  Skip project ${p.id}: ${(err as Error).message}`);
    }
  }
  return count;
}

async function migrateAssets() {
  // First get projects to find asset data files
  const projects = await fetchGitHub<Record<string, unknown>[]>('data/projects.json');
  const allAssets: Record<string, unknown>[] = [];

  for (const project of (projects || [])) {
    const assetFile = project.asset_data_file || project.assetDataFile;
    if (!assetFile) continue;

    const filePath = String(assetFile).startsWith('data/') ? String(assetFile) : `data/assets/${assetFile}`;
    try {
      const assets = await fetchGitHub<Record<string, unknown>[]>(filePath);
      if (Array.isArray(assets)) {
        // Tag each asset with its project ID
        for (const a of assets) {
          a._projectId = a.project_id || a.projectId || project.id;
          allAssets.push(a);
        }
      }
    } catch (err) {
      log('⚠️', `  Skip asset file ${filePath}: ${(err as Error).message}`);
    }
  }

  let count = 0;
  for (const a of allAssets) {
    const storage = (a.storage || {}) as Record<string, string>;
    const nft = (a.nft || {}) as Record<string, string>;

    try {
      await db.insert(schema.assets).values({
        id: String(a.id),
        canonical: a.canonical ? String(a.canonical) : null,
        name: String(a.name || 'Untitled'),
        projectId: String(a._projectId || ''),
        type: a.type ? String(a.type) : (a.format ? String(a.format).toLowerCase() : null),
        description: a.description ? String(a.description) : null,
        thumbnailUrl: (a.thumbnail_url || a.thumbnailUrl) ? String(a.thumbnail_url || a.thumbnailUrl) : null,
        modelFileUrl: (a.model_file_url || a.modelFileUrl) ? String(a.model_file_url || a.modelFileUrl) : null,
        polygonCount: a.polygon_count != null ? Number(a.polygon_count) : (a.polygonCount != null ? Number(a.polygonCount) : null),
        format: String(a.format || ''),
        materialCount: a.material_count != null ? Number(a.material_count) : (a.materialCount != null ? Number(a.materialCount) : null),
        isPublic: (a.is_public ?? a.isPublic) !== false,
        isDraft: (a.is_draft ?? a.isDraft) === true,
        status: a.status ? String(a.status) : 'active',
        version: a.version ? String(a.version) : '0.1.0',
        license: a.license ? String(a.license) : 'CC0',
        creator: a.creator ? String(a.creator) : null,
        contentType: a.content_type ? String(a.content_type) : null,
        fileSizeBytes: a.file_size_bytes != null ? Number(a.file_size_bytes) : null,
        fileHash: a.file_hash ? String(a.file_hash) : null,
        metadata: (a.metadata || {}) as Record<string, unknown>,
        storageR2: storage.r2 || null,
        storageIpfsCid: storage.ipfs_cid || null,
        storageArweaveTx: storage.arweave_tx || null,
        storageGithubRaw: storage.github_raw || null,
        nftType: nft.type || 'standard',
        nftMintStatus: nft.mint_status || 'unminted',
        nftChainId: nft.chain_id || null,
        nftContract: nft.contract || null,
        nftTokenId: nft.token_id || null,
        nftOwner: nft.owner || null,
        nftMintTx: nft.mint_tx || null,
        tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
        createdAt: toDate((a.created_at || a.createdAt) as string),
        updatedAt: toDate((a.updated_at || a.updatedAt) as string),
      }).onConflictDoNothing();
      count++;
    } catch (err) {
      log('⚠️', `  Skip asset ${a.id}: ${(err as Error).message}`);
    }
  }
  return count;
}

async function migrateUsers() {
  const users = await fetchGitHub<Record<string, unknown>[]>('data/users.json');
  if (!users?.length) { log('⚠️', 'No users found'); return 0; }

  let count = 0;
  for (const u of users) {
    try {
      await db.insert(schema.users).values({
        id: String(u.id),
        username: String(u.username || u.id),
        email: u.email ? String(u.email) : null,
        role: String(u.role || 'user'),
        walletAddress: u.wallet_address ? String(u.wallet_address).toLowerCase() : null,
        githubId: u.github_id ? String(u.github_id) : null,
        githubUsername: u.github_username ? String(u.github_username) : null,
        createdAt: toDate(u.created_at as string),
        updatedAt: toDate(u.updated_at as string),
      }).onConflictDoNothing();
      count++;
    } catch (err) {
      log('⚠️', `  Skip user ${u.id}: ${(err as Error).message}`);
    }
  }
  return count;
}

async function migrateTags() {
  const tags = await fetchGitHub<Record<string, unknown>[]>('data/tags.json');
  if (!tags?.length) return 0;

  let count = 0;
  for (const t of tags) {
    try {
      await db.insert(schema.tags).values({
        id: String(t.id),
        name: String(t.name),
        createdAt: toDate(t.created_at as string),
        updatedAt: toDate(t.updated_at as string),
      }).onConflictDoNothing();
      count++;
    } catch (err) {
      log('⚠️', `  Skip tag ${t.id}: ${(err as Error).message}`);
    }
  }
  return count;
}

async function migrateAvatarTags() {
  const avatarTags = await fetchGitHub<Record<string, unknown>[]>('data/avatar-tags.json');
  if (!avatarTags?.length) return 0;

  let count = 0;
  for (const at of avatarTags) {
    try {
      await db.insert(schema.assetTags).values({
        assetId: String(at.avatar_id || at.avatarId),
        tagId: String(at.tag_id || at.tagId),
      }).onConflictDoNothing();
      count++;
    } catch (err) {
      // Foreign key failures expected if asset/tag doesn't exist
    }
  }
  return count;
}

async function migrateDownloadCounts() {
  const data = await fetchGitHub<{ counts: Record<string, number> }>('download-counts.json');
  if (!data?.counts) return 0;

  let count = 0;
  for (const [assetId, downloadCount] of Object.entries(data.counts)) {
    try {
      await db.insert(schema.downloadCounts).values({
        assetId,
        count: downloadCount,
      }).onConflictDoNothing();
      count++;
    } catch {
      // FK failures expected for deleted assets
    }
  }
  return count;
}

async function migratePortals() {
  const data = await fetchGitHub<unknown>('data/portals/numinia-portals.json');
  if (!data) return 0;

  await db.insert(schema.portals).values({
    id: 'main',
    data: data as Record<string, unknown>,
    updatedAt: new Date(),
  }).onConflictDoNothing();
  return 1;
}

async function migrateSeasons() {
  // Read season index to find active season IDs
  const index = await fetchGitHub<{ activeSeasonId?: string }>('data/seasons/seasons-index.json');
  if (!index?.activeSeasonId) { log('⚠️', 'No active season found'); return 0; }

  const seasonId = index.activeSeasonId;
  const season = await fetchGitHub<Record<string, unknown>>(`data/seasons/${seasonId}.json`);
  if (!season) return 0;

  // Insert season
  await db.insert(schema.seasons).values({
    id: String(season.id),
    slug: String(season.slug || season.id),
    title: (season.title || {}) as Record<string, unknown>,
    description: (season.description || {}) as Record<string, unknown>,
    status: String(season.status || 'active'),
    passPriceEur: String(season.passPriceEur || '9.99'),
    stripePriceId: String(season.stripePriceId || ''),
    startDate: toDate(season.startDate as string),
    endDate: toDate(season.endDate as string),
    burnRitual: (season.burnRitual || null) as Record<string, unknown> | null,
  }).onConflictDoNothing();

  // Insert adventures
  const adventures = (season.adventures || []) as Record<string, unknown>[];
  let adventureCount = 0;
  for (const adv of adventures) {
    try {
      await db.insert(schema.adventures).values({
        id: String(adv.id),
        seasonId: String(season.id),
        orderNum: Number(adv.order || 0),
        name: (adv.name || {}) as Record<string, unknown>,
        description: (adv.description || {}) as Record<string, unknown>,
        url: String(adv.url || ''),
        requiresPass: adv.requiresPass === true,
        durationMinutes: adv.durationMinutes ? Number(adv.durationMinutes) : null,
        difficulty: adv.difficulty ? Number(adv.difficulty) : null,
        puzzleType: adv.puzzleType ? String(adv.puzzleType) : null,
        published: adv.published !== false,
        freeLoot: (adv.freeLoot || null) as Record<string, unknown> | null,
        premiumLoot: (adv.premiumLoot || null) as Record<string, unknown> | null,
      }).onConflictDoNothing();
      adventureCount++;
    } catch (err) {
      log('⚠️', `  Skip adventure ${adv.id}: ${(err as Error).message}`);
    }
  }

  // Insert pass holders from progress file
  let holderCount = 0;
  try {
    const progress = await fetchGitHub<{ passHolders?: Record<string, unknown>[] }>(
      `data/seasons/${seasonId}-progress.json`
    );
    for (const ph of (progress?.passHolders || [])) {
      try {
        await db.insert(schema.passHolders).values({
          seasonId: String(season.id),
          walletAddress: String(ph.address || '').toLowerCase(),
          purchasedAt: toDate(ph.purchasedAt as string),
          stripeSessionId: String(ph.stripeSessionId || ''),
          nftTokenId: ph.nftTokenId ? String(ph.nftTokenId) : null,
          nftTransactionHash: ph.nftTransactionHash ? String(ph.nftTransactionHash) : null,
          completedAdventures: Array.isArray(ph.completedAdventures) ? ph.completedAdventures as string[] : [],
          burnCompleted: ph.burnCompleted === true,
        }).onConflictDoNothing();
        holderCount++;
      } catch {
        // Skip duplicate holders
      }
    }
  } catch {
    log('⚠️', 'No season progress file found');
  }

  log('📊', `  ${adventureCount} adventures, ${holderCount} pass holders`);
  return 1;
}

/* ────────────────────────── main ────────────────────────── */

async function main() {
  log('🚀', 'Starting GitHub → PostgreSQL migration');
  log('📡', `Source: ${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}`);
  log('🗄️', `Target: ${DATABASE_URL!.replace(/:[^@]*@/, ':***@')}`);
  console.log('');

  const results: Record<string, number> = {};

  log('📦', 'Migrating projects...');
  results.projects = await migrateProjects();
  log('✅', `  ${results.projects} projects`);

  log('🎨', 'Migrating assets...');
  results.assets = await migrateAssets();
  log('✅', `  ${results.assets} assets`);

  log('👤', 'Migrating users...');
  results.users = await migrateUsers();
  log('✅', `  ${results.users} users`);

  log('🏷️', 'Migrating tags...');
  results.tags = await migrateTags();
  log('✅', `  ${results.tags} tags`);

  log('🔗', 'Migrating asset-tag associations...');
  results.assetTags = await migrateAvatarTags();
  log('✅', `  ${results.assetTags} associations`);

  log('📊', 'Migrating download counts...');
  results.downloadCounts = await migrateDownloadCounts();
  log('✅', `  ${results.downloadCounts} counters`);

  log('🗺️', 'Migrating portals...');
  results.portals = await migratePortals();
  log('✅', `  ${results.portals} portal documents`);

  log('🎮', 'Migrating seasons...');
  results.seasons = await migrateSeasons();
  log('✅', `  ${results.seasons} seasons`);

  console.log('');
  log('🎉', 'Migration complete!');
  console.table(results);
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
