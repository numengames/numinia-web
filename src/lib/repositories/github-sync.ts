/**
 * GitHub Sync — exports DB state back to GitHub JSON files.
 *
 * Preserves the File Over App philosophy: the GitHub data repo remains
 * a complete, human-readable, forkable archive of all platform data,
 * even when PostgreSQL is the runtime data source.
 *
 * Usage:
 *   - After DB writes: fire-and-forget sync of changed entity
 *   - Nightly cron: full export of all tables
 *   - Admin button: manual full sync via POST /api/admin/sync-to-github
 *
 * This module uses the existing updateData() from github-storage.ts
 * to write JSON files to the data repo with proper optimistic locking.
 */

import { eq } from 'drizzle-orm';
import { updateData } from '@/lib/github-storage';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { createLogger } from '@/lib/logger';

const log = createLogger('lib/github-sync');

/**
 * Export all assets from DB to their respective GitHub JSON files.
 * Groups assets by project and writes each project's asset file.
 */
export async function syncAssetsToGitHub(): Promise<{ synced: number; errors: number }> {
  const db = getDb();
  if (!db) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  try {
    // Get all projects to know where to write
    const projects = await db.select().from(schema.projects);

    for (const project of projects) {
      if (!project.assetDataFile) continue;

      const filePath = project.assetDataFile.startsWith('data/')
        ? project.assetDataFile
        : `data/assets/${project.assetDataFile}`;

      try {
        // Get all assets for this project from DB
        const assets = await db.select().from(schema.assets)
          .where(eq(schema.assets.projectId, project.id));

        // Convert to snake_case JSON (matches GitHub repo format)
        const jsonAssets = assets.map(a => ({
          id: a.id,
          name: a.name,
          project_id: a.projectId,
          description: a.description,
          thumbnail_url: a.thumbnailUrl,
          model_file_url: a.modelFileUrl,
          polygon_count: a.polygonCount,
          format: a.format,
          material_count: a.materialCount,
          is_public: a.isPublic,
          is_draft: a.isDraft,
          status: a.status,
          version: a.version,
          license: a.license,
          creator: a.creator,
          content_type: a.contentType,
          file_size_bytes: a.fileSizeBytes,
          file_hash: a.fileHash,
          canonical: a.canonical,
          metadata: a.metadata,
          storage: {
            r2: a.storageR2,
            ipfs_cid: a.storageIpfsCid,
            arweave_tx: a.storageArweaveTx,
            github_raw: a.storageGithubRaw,
          },
          nft: {
            type: a.nftType,
            mint_status: a.nftMintStatus,
            chain_id: a.nftChainId,
            contract: a.nftContract,
            token_id: a.nftTokenId,
            owner: a.nftOwner,
            mint_tx: a.nftMintTx,
          },
          tags: a.tags || [],
          created_at: a.createdAt.toISOString(),
          updated_at: a.updatedAt.toISOString(),
        }));

        await updateData(filePath, jsonAssets, `sync: ${project.id} (${jsonAssets.length} assets)`);
        synced += jsonAssets.length;
      } catch (err) {
        log.error({ err, projectId: project.id }, 'Failed to sync project assets');
        errors++;
      }
    }
  } catch (err) {
    log.error({ err }, 'Failed to sync assets to GitHub');
    errors++;
  }

  return { synced, errors };
}

/**
 * Export projects from DB to GitHub.
 */
export async function syncProjectsToGitHub(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const projects = await db.select().from(schema.projects);
    const jsonProjects = projects.map(p => ({
      id: p.id,
      name: p.name,
      creator_id: p.creatorId,
      description: p.description,
      is_public: p.isPublic,
      license: p.license,
      source_type: p.sourceType,
      asset_data_file: p.assetDataFile,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    }));

    await updateData('data/projects.json', jsonProjects, `sync: projects (${jsonProjects.length})`);
    return true;
  } catch (err) {
    log.error({ err }, 'Failed to sync projects to GitHub');
    return false;
  }
}

/**
 * Export users from DB to GitHub.
 */
export async function syncUsersToGitHub(): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  try {
    const users = await db.select().from(schema.users);
    const jsonUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      wallet_address: u.walletAddress,
      github_id: u.githubId,
      github_username: u.githubUsername,
      created_at: u.createdAt.toISOString(),
      updated_at: u.updatedAt.toISOString(),
    }));

    await updateData('data/users.json', jsonUsers, `sync: users (${jsonUsers.length})`);
    return true;
  } catch (err) {
    log.error({ err }, 'Failed to sync users to GitHub');
    return false;
  }
}

/**
 * Full sync — exports all DB tables to GitHub JSON.
 * Intended for nightly cron or manual admin trigger.
 */
export async function fullSyncToGitHub(): Promise<{
  assets: { synced: number; errors: number };
  projects: boolean;
  users: boolean;
}> {
  log.info('Starting full DB → GitHub sync');

  const [assets, projects, users] = await Promise.all([
    syncAssetsToGitHub(),
    syncProjectsToGitHub(),
    syncUsersToGitHub(),
  ]);

  log.info({ assets, projects, users }, 'Full sync complete');
  return { assets, projects, users };
}
