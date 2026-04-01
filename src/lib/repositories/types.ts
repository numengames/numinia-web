/**
 * Repository interfaces — abstract data access behind a common API.
 *
 * Both GitHub (JSON files) and PostgreSQL (Drizzle) implement these.
 * API routes use the factory in data-source.ts to get the right one.
 *
 * All methods return the same camelCase types as github-storage.ts,
 * so swapping implementations requires zero changes in route handlers.
 */

import type { GithubAvatar, GithubProject, GithubUser, GithubTag, GithubAvatarTag } from '@/lib/github-storage';

/* ────────────────────────── Pagination ────────────────────────── */

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/* ────────────────────────── Assets ────────────────────────── */

export interface IAssetRepository {
  /** Get all assets, optionally filtered by project IDs. */
  getAll(projectIds?: string[]): Promise<GithubAvatar[]>;

  /** Get a single asset by ID. Returns undefined if not found. */
  getById(id: string): Promise<GithubAvatar | undefined>;

  /** Create a new asset. Returns the created asset. */
  create(asset: GithubAvatar): Promise<GithubAvatar>;

  /** Update specific fields of an asset. Returns true if found and updated. */
  update(id: string, updates: Record<string, unknown>): Promise<boolean>;

  /** Delete an asset by ID. Returns true if found and deleted. */
  delete(id: string): Promise<boolean>;

  /** Save the full avatar list (bulk write). Used by legacy code paths. */
  saveAll(avatars: GithubAvatar[]): Promise<void>;
}

/* ────────────────────────── Projects ────────────────────────── */

export interface IProjectRepository {
  getAll(): Promise<GithubProject[]>;
  getById(id: string): Promise<GithubProject | undefined>;
  saveAll(projects: GithubProject[]): Promise<void>;
}

/* ────────────────────────── Users ────────────────────────── */

export interface IUserRepository {
  getAll(): Promise<GithubUser[]>;
  getById(id: string): Promise<GithubUser | undefined>;
  getByWalletAddress(address: string): Promise<GithubUser | undefined>;
  getByGithubId(githubId: string): Promise<GithubUser | undefined>;
  saveAll(users: GithubUser[]): Promise<void>;
}

/* ────────────────────────── Tags ────────────────────────── */

export interface ITagRepository {
  getAll(): Promise<GithubTag[]>;
  saveAll(tags: GithubTag[]): Promise<void>;
}

/* ────────────────────────── Asset Tags ────────────────────────── */

export interface IAssetTagRepository {
  getAll(): Promise<GithubAvatarTag[]>;
  saveAll(assetTags: GithubAvatarTag[]): Promise<void>;
}

/* ────────────────────────── Download Counts ────────────────────────── */

export type DownloadCounts = { counts: Record<string, number> };

export interface IDownloadCountRepository {
  getAll(): Promise<DownloadCounts>;
  saveAll(counts: DownloadCounts): Promise<void>;
  increment(assetId: string): Promise<void>;
}

/* ────────────────────────── Characters ────────────────────────── */

export interface ICharacterRepository {
  getByWallet(address: string): Promise<{ exists: boolean; content: string | null }>;
  save(address: string, content: string): Promise<void>;
}

/* ────────────────────────── Portals ────────────────────────── */

export interface IPortalRepository {
  getData(): Promise<unknown>;
}

/* ────────────────────────── Aggregate ────────────────────────── */

export interface IDataSource {
  assets: IAssetRepository;
  projects: IProjectRepository;
  users: IUserRepository;
  tags: ITagRepository;
  assetTags: IAssetTagRepository;
  downloadCounts: IDownloadCountRepository;
  characters: ICharacterRepository;
  portals: IPortalRepository;
}
