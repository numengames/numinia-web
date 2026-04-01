/**
 * PostgreSQL repository implementation — uses Drizzle ORM with Neon.
 *
 * Returns the same camelCase types as github-storage.ts, so API routes
 * can swap data sources with zero code changes.
 *
 * This is the "fast path" — proper queries, indexes, pagination-ready.
 */

import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import * as s from '@/db/schema';
import type { GithubAvatar, GithubProject, GithubUser, GithubTag, GithubAvatarTag } from '@/lib/github-storage';
import type {
  IAssetRepository, IProjectRepository, IUserRepository,
  ITagRepository, IAssetTagRepository, IDownloadCountRepository,
  ICharacterRepository, IPortalRepository, IDataSource,
  DownloadCounts,
} from './types';

/** Convert a DB asset row to the GithubAvatar shape expected by routes. */
function rowToAvatar(row: typeof s.assets.$inferSelect): GithubAvatar {
  return {
    id: row.id,
    name: row.name,
    projectId: row.projectId ?? '',
    description: row.description ?? undefined,
    thumbnailUrl: row.thumbnailUrl,
    modelFileUrl: row.modelFileUrl,
    polygonCount: row.polygonCount ?? undefined,
    format: row.format,
    materialCount: row.materialCount ?? undefined,
    isPublic: row.isPublic,
    isDraft: row.isDraft,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    storage: {
      r2: row.storageR2 ?? undefined,
      ipfs_cid: row.storageIpfsCid ?? undefined,
      arweave_tx: row.storageArweaveTx ?? undefined,
      github_raw: row.storageGithubRaw ?? undefined,
    },
    status: row.status ?? undefined,
    version: row.version ?? undefined,
    file_size_bytes: row.fileSizeBytes ?? undefined,
    file_hash: row.fileHash ?? undefined,
    canonical: row.canonical ?? undefined,
    content_type: row.contentType ?? undefined,
    license: row.license ?? undefined,
    creator: row.creator ?? undefined,
    nft: {
      type: row.nftType ?? 'standard',
      mint_status: row.nftMintStatus ?? 'unminted',
      chain_id: row.nftChainId ?? undefined,
      contract: row.nftContract ?? undefined,
      token_id: row.nftTokenId ?? undefined,
      owner: row.nftOwner ?? undefined,
      mint_tx: row.nftMintTx ?? undefined,
    },
  };
}

function rowToProject(row: typeof s.projects.$inferSelect): GithubProject {
  return {
    id: row.id,
    name: row.name,
    creatorId: row.creatorId ?? '',
    description: row.description ?? undefined,
    isPublic: row.isPublic,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    asset_data_file: row.assetDataFile ?? undefined,
  };
}

function rowToUser(row: typeof s.users.$inferSelect): GithubUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email ?? '',
    passwordHash: '', // Not stored in DB, legacy field
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ────────────────────────── Assets ────────────────────────── */

class DbAssetRepository implements IAssetRepository {
  async getAll(projectIds?: string[]): Promise<GithubAvatar[]> {
    const db = getDb()!;
    let query;
    if (projectIds && projectIds.length > 0) {
      query = db.select().from(s.assets).where(inArray(s.assets.projectId, projectIds));
    } else {
      query = db.select().from(s.assets);
    }
    const rows = await query;
    return rows.map(rowToAvatar);
  }

  async getById(id: string): Promise<GithubAvatar | undefined> {
    const db = getDb()!;
    const rows = await db.select().from(s.assets).where(eq(s.assets.id, id)).limit(1);
    return rows[0] ? rowToAvatar(rows[0]) : undefined;
  }

  async create(asset: GithubAvatar): Promise<GithubAvatar> {
    const db = getDb()!;
    await db.insert(s.assets).values({
      id: asset.id,
      canonical: asset.canonical,
      name: asset.name,
      projectId: asset.projectId,
      type: asset.format,
      description: asset.description,
      thumbnailUrl: asset.thumbnailUrl,
      modelFileUrl: asset.modelFileUrl,
      polygonCount: asset.polygonCount,
      format: asset.format,
      materialCount: asset.materialCount,
      isPublic: asset.isPublic,
      isDraft: asset.isDraft,
      metadata: asset.metadata,
      storageR2: asset.storage?.r2,
      storageIpfsCid: asset.storage?.ipfs_cid,
      storageArweaveTx: asset.storage?.arweave_tx,
      storageGithubRaw: asset.storage?.github_raw,
      nftType: (asset.nft as Record<string, string>)?.type,
      nftMintStatus: (asset.nft as Record<string, string>)?.mint_status,
      nftChainId: (asset.nft as Record<string, string>)?.chain_id,
      nftContract: (asset.nft as Record<string, string>)?.contract,
      nftTokenId: (asset.nft as Record<string, string>)?.token_id,
      nftOwner: (asset.nft as Record<string, string>)?.owner,
      nftMintTx: (asset.nft as Record<string, string>)?.mint_tx,
      status: asset.status,
      version: asset.version,
      fileSizeBytes: asset.file_size_bytes,
      fileHash: asset.file_hash,
      contentType: asset.content_type,
      license: asset.license,
      creator: asset.creator,
      tags: (asset as unknown as { tags?: string[] }).tags ?? [],
    });
    return asset;
  }

  async update(id: string, updates: Record<string, unknown>): Promise<boolean> {
    const db = getDb()!;
    // Map camelCase/snake_case updates to DB columns
    const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };

    const mapping: Record<string, string> = {
      name: 'name', description: 'description', thumbnail_url: 'thumbnailUrl',
      thumbnailUrl: 'thumbnailUrl', model_file_url: 'modelFileUrl',
      is_public: 'isPublic', isPublic: 'isPublic', is_draft: 'isDraft',
      isDraft: 'isDraft', status: 'status', version: 'version',
      license: 'license', creator: 'creator', tags: 'tags',
      storage_r2: 'storageR2', storage_ipfs_cid: 'storageIpfsCid',
      storage_arweave_tx: 'storageArweaveTx', storage_github_raw: 'storageGithubRaw',
    };

    for (const [key, value] of Object.entries(updates)) {
      const col = mapping[key];
      if (col) dbUpdates[col] = value;
    }

    // Handle nested storage/nft objects
    if (updates.storage && typeof updates.storage === 'object') {
      const st = updates.storage as Record<string, string>;
      if (st.r2 !== undefined) dbUpdates.storageR2 = st.r2;
      if (st.ipfs_cid !== undefined) dbUpdates.storageIpfsCid = st.ipfs_cid;
      if (st.arweave_tx !== undefined) dbUpdates.storageArweaveTx = st.arweave_tx;
      if (st.github_raw !== undefined) dbUpdates.storageGithubRaw = st.github_raw;
    }

    if (updates.nft && typeof updates.nft === 'object') {
      const nft = updates.nft as Record<string, string>;
      if (nft.type !== undefined) dbUpdates.nftType = nft.type;
      if (nft.mint_status !== undefined) dbUpdates.nftMintStatus = nft.mint_status;
      if (nft.chain_id !== undefined) dbUpdates.nftChainId = nft.chain_id;
      if (nft.contract !== undefined) dbUpdates.nftContract = nft.contract;
      if (nft.token_id !== undefined) dbUpdates.nftTokenId = nft.token_id;
      if (nft.owner !== undefined) dbUpdates.nftOwner = nft.owner;
      if (nft.mint_tx !== undefined) dbUpdates.nftMintTx = nft.mint_tx;
    }

    const result = await db.update(s.assets).set(dbUpdates).where(eq(s.assets.id, id));
    return (result as unknown as { rowCount: number }).rowCount > 0;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb()!;
    const result = await db.delete(s.assets).where(eq(s.assets.id, id));
    return (result as unknown as { rowCount: number }).rowCount > 0;
  }

  async saveAll(_avatars: GithubAvatar[]): Promise<void> {
    // Bulk write not needed for DB — individual CRUD is preferred.
    // If needed for migration, use the migration script instead.
    throw new Error('saveAll not implemented for DB repo — use create/update/delete');
  }
}

/* ────────────────────────── Projects ────────────────────────── */

class DbProjectRepository implements IProjectRepository {
  async getAll(): Promise<GithubProject[]> {
    const db = getDb()!;
    const rows = await db.select().from(s.projects);
    return rows.map(rowToProject);
  }

  async getById(id: string): Promise<GithubProject | undefined> {
    const db = getDb()!;
    const rows = await db.select().from(s.projects).where(eq(s.projects.id, id)).limit(1);
    return rows[0] ? rowToProject(rows[0]) : undefined;
  }

  async saveAll(_projects: GithubProject[]): Promise<void> {
    throw new Error('saveAll not implemented for DB repo');
  }
}

/* ────────────────────────── Users ────────────────────────── */

class DbUserRepository implements IUserRepository {
  async getAll(): Promise<GithubUser[]> {
    const db = getDb()!;
    const rows = await db.select().from(s.users);
    return rows.map(rowToUser);
  }

  async getById(id: string): Promise<GithubUser | undefined> {
    const db = getDb()!;
    const rows = await db.select().from(s.users).where(eq(s.users.id, id)).limit(1);
    return rows[0] ? rowToUser(rows[0]) : undefined;
  }

  async getByWalletAddress(address: string): Promise<GithubUser | undefined> {
    const db = getDb()!;
    const rows = await db.select().from(s.users)
      .where(eq(s.users.walletAddress, address.toLowerCase()))
      .limit(1);
    return rows[0] ? rowToUser(rows[0]) : undefined;
  }

  async getByGithubId(githubId: string): Promise<GithubUser | undefined> {
    const db = getDb()!;
    const rows = await db.select().from(s.users)
      .where(eq(s.users.githubId, githubId))
      .limit(1);
    return rows[0] ? rowToUser(rows[0]) : undefined;
  }

  async saveAll(_users: GithubUser[]): Promise<void> {
    throw new Error('saveAll not implemented for DB repo');
  }
}

/* ────────────────────────── Tags ────────────────────────── */

class DbTagRepository implements ITagRepository {
  async getAll(): Promise<GithubTag[]> {
    const db = getDb()!;
    const rows = await db.select().from(s.tags);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async saveAll(_tags: GithubTag[]): Promise<void> {
    throw new Error('saveAll not implemented for DB repo');
  }
}

/* ────────────────────────── Asset Tags ────────────────────────── */

class DbAssetTagRepository implements IAssetTagRepository {
  async getAll(): Promise<GithubAvatarTag[]> {
    const db = getDb()!;
    const rows = await db.select().from(s.assetTags);
    return rows.map(r => ({ avatarId: r.assetId, tagId: r.tagId }));
  }

  async saveAll(_assetTags: GithubAvatarTag[]): Promise<void> {
    throw new Error('saveAll not implemented for DB repo');
  }
}

/* ────────────────────────── Download Counts ────────────────────────── */

class DbDownloadCountRepository implements IDownloadCountRepository {
  async getAll(): Promise<DownloadCounts> {
    const db = getDb()!;
    const rows = await db.select().from(s.downloadCounts);
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.assetId] = r.count;
    return { counts };
  }

  async saveAll(_counts: DownloadCounts): Promise<void> {
    throw new Error('saveAll not implemented for DB repo');
  }

  async increment(assetId: string): Promise<void> {
    const db = getDb()!;
    await db.insert(s.downloadCounts)
      .values({ assetId, count: 1 })
      .onConflictDoUpdate({
        target: s.downloadCounts.assetId,
        set: { count: sql`${s.downloadCounts.count} + 1` },
      });
  }
}

/* ────────────────────────── Characters ────────────────────────── */

class DbCharacterRepository implements ICharacterRepository {
  async getByWallet(address: string): Promise<{ exists: boolean; content: string | null }> {
    const db = getDb()!;
    const rows = await db.select().from(s.characters)
      .where(eq(s.characters.walletAddress, address.toLowerCase()))
      .limit(1);
    if (!rows[0]) return { exists: false, content: null };
    return { exists: true, content: rows[0].content };
  }

  async save(address: string, content: string): Promise<void> {
    const db = getDb()!;
    await db.insert(s.characters)
      .values({ walletAddress: address.toLowerCase(), content, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: s.characters.walletAddress,
        set: { content, updatedAt: new Date() },
      });
  }
}

/* ────────────────────────── Portals ────────────────────────── */

class DbPortalRepository implements IPortalRepository {
  async getData(): Promise<unknown> {
    const db = getDb()!;
    const rows = await db.select().from(s.portals).where(eq(s.portals.id, 'main')).limit(1);
    return rows[0]?.data ?? {};
  }
}

/* ────────────────────────── Factory ────────────────────────── */

export function createDbDataSource(): IDataSource {
  return {
    assets: new DbAssetRepository(),
    projects: new DbProjectRepository(),
    users: new DbUserRepository(),
    tags: new DbTagRepository(),
    assetTags: new DbAssetTagRepository(),
    downloadCounts: new DbDownloadCountRepository(),
    characters: new DbCharacterRepository(),
    portals: new DbPortalRepository(),
  };
}
