/**
 * Drizzle ORM schema — PostgreSQL via Neon.
 *
 * Mirrors the JSON structures in the GitHub data repo.
 * Designed for the repository pattern: github-storage.ts returns the same
 * shapes as these tables, so API routes can swap data sources transparently.
 *
 * Naming: snake_case columns match the GitHub JSON convention.
 */

import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/* ────────────────────────── projects ────────────────────────── */

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  creatorId: text('creator_id'),
  description: text('description'),
  isPublic: boolean('is_public').default(true).notNull(),
  license: text('license').default('CC0'),
  sourceType: text('source_type'),
  sourceNetwork: text('source_network'), // JSON array stored as text for simplicity
  sourceContract: text('source_contract'),
  storageType: text('storage_type'),
  openseaUrl: text('opensea_url'),
  assetDataFile: text('asset_data_file'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('projects_is_public_idx').on(t.isPublic),
]);

/* ────────────────────────── assets ────────────────────────── */

export const assets = pgTable('assets', {
  id: text('id').primaryKey(), // ndg-{uuid-v7}
  canonical: text('canonical'),
  name: text('name').notNull(),
  projectId: text('project_id').references(() => projects.id),
  type: text('type'), // vrm, glb, hyp, stl, mp3, etc.
  description: text('description'),
  thumbnailUrl: text('thumbnail_url'),
  modelFileUrl: text('model_file_url'),
  polygonCount: integer('polygon_count'),
  format: text('format').notNull().default(''),
  materialCount: integer('material_count'),
  isPublic: boolean('is_public').default(true).notNull(),
  isDraft: boolean('is_draft').default(false).notNull(),
  status: text('status').default('active'),
  statusReason: text('status_reason'),
  version: text('version').default('0.1.0'),
  previousVersion: text('previous_version'),
  license: text('license').default('CC0'),
  creator: text('creator'),
  contentType: text('content_type'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
  fileHash: text('file_hash'),
  // Semi-structured metadata (alternateModels, custom fields)
  metadata: jsonb('metadata').default({}),
  // Storage — flattened for indexing
  storageR2: text('storage_r2'),
  storageIpfsCid: text('storage_ipfs_cid'),
  storageArweaveTx: text('storage_arweave_tx'),
  storageGithubRaw: text('storage_github_raw'),
  // NFT — flattened for indexing
  nftType: text('nft_type').default('standard'),
  nftMintStatus: text('nft_mint_status').default('unminted'),
  nftChainId: text('nft_chain_id'),
  nftContract: text('nft_contract'),
  nftTokenId: text('nft_token_id'),
  nftOwner: text('nft_owner'),
  nftMintTx: text('nft_mint_tx'),
  // Tags as text array
  tags: text('tags').array().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('assets_project_id_idx').on(t.projectId),
  index('assets_format_idx').on(t.format),
  index('assets_is_public_idx').on(t.isPublic, t.isDraft),
  index('assets_status_idx').on(t.status),
  index('assets_nft_mint_status_idx').on(t.nftMintStatus),
  uniqueIndex('assets_canonical_idx').on(t.canonical),
]);

/* ────────────────────────── tags ────────────────────────── */

export const tags = pgTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────── asset_tags (junction) ────────────────────────── */

export const assetTags = pgTable('asset_tags', {
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.assetId, t.tagId] }),
]);

/* ────────────────────────── users ────────────────────────── */

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email'),
  role: text('role').default('user').notNull(),
  walletAddress: text('wallet_address').unique(),
  githubId: text('github_id').unique(),
  githubUsername: text('github_username'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('users_wallet_address_idx').on(t.walletAddress),
]);

/* ────────────────────────── favorites ────────────────────────── */

export const favorites = pgTable('favorites', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  walletAddress: text('wallet_address').notNull(),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('favorites_wallet_asset_idx').on(t.walletAddress, t.assetId),
  index('favorites_wallet_idx').on(t.walletAddress),
]);

/* ────────────────────────── characters ────────────────────────── */

export const characters = pgTable('characters', {
  walletAddress: text('wallet_address').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────── seasons ────────────────────────── */

export const seasons = pgTable('seasons', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  title: jsonb('title').notNull(), // { en: "...", ja: "..." }
  description: jsonb('description').default({}),
  status: text('status').notNull(), // active, upcoming, ended
  passPriceEur: numeric('pass_price_eur', { precision: 10, scale: 2 }).notNull(),
  stripePriceId: text('stripe_price_id').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  burnRitual: jsonb('burn_ritual'),
}, (t) => [
  index('seasons_status_idx').on(t.status),
]);

/* ────────────────────────── adventures ────────────────────────── */

export const adventures = pgTable('adventures', {
  id: text('id').primaryKey(),
  seasonId: text('season_id').notNull().references(() => seasons.id, { onDelete: 'cascade' }),
  orderNum: integer('order_num').notNull(),
  name: jsonb('name').notNull(), // i18n
  description: jsonb('description').default({}),
  url: text('url').notNull(),
  requiresPass: boolean('requires_pass').default(false).notNull(),
  durationMinutes: integer('duration_minutes'),
  difficulty: integer('difficulty'),
  puzzleType: text('puzzle_type'),
  published: boolean('published').default(true).notNull(),
  freeLoot: jsonb('free_loot'),
  premiumLoot: jsonb('premium_loot'),
}, (t) => [
  uniqueIndex('adventures_season_order_idx').on(t.seasonId, t.orderNum),
]);

/* ────────────────────────── pass_holders ────────────────────────── */

export const passHolders = pgTable('pass_holders', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  seasonId: text('season_id').notNull().references(() => seasons.id, { onDelete: 'cascade' }),
  walletAddress: text('wallet_address').notNull(),
  purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull(),
  stripeSessionId: text('stripe_session_id').notNull(),
  nftTokenId: text('nft_token_id'),
  nftTransactionHash: text('nft_transaction_hash'),
  completedAdventures: text('completed_adventures').array().default(sql`'{}'::text[]`),
  burnCompleted: boolean('burn_completed').default(false).notNull(),
}, (t) => [
  uniqueIndex('pass_holders_season_wallet_idx').on(t.seasonId, t.walletAddress),
  index('pass_holders_wallet_idx').on(t.walletAddress),
]);

/* ────────────────────────── portals ────────────────────────── */

export const portals = pgTable('portals', {
  id: text('id').primaryKey().default('main'),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ────────────────────────── audit_events ────────────────────────── */

export const auditEvents = pgTable('audit_events', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  target: text('target'),
  metadata: jsonb('metadata'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('audit_events_timestamp_idx').on(t.timestamp),
  index('audit_events_actor_idx').on(t.actor),
]);

/* ────────────────────────── download_counts ────────────────────────── */

export const downloadCounts = pgTable('download_counts', {
  assetId: text('asset_id').primaryKey().references(() => assets.id, { onDelete: 'cascade' }),
  count: integer('count').default(0).notNull(),
});

/* ────────────────────────── relations ────────────────────────── */

export const projectsRelations = relations(projects, ({ many }) => ({
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  project: one(projects, { fields: [assets.projectId], references: [projects.id] }),
  assetTags: many(assetTags),
  downloadCount: one(downloadCounts, { fields: [assets.id], references: [downloadCounts.assetId] }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  assetTags: many(assetTags),
}));

export const assetTagsRelations = relations(assetTags, ({ one }) => ({
  asset: one(assets, { fields: [assetTags.assetId], references: [assets.id] }),
  tag: one(tags, { fields: [assetTags.tagId], references: [tags.id] }),
}));

export const seasonsRelations = relations(seasons, ({ many }) => ({
  adventures: many(adventures),
  passHolders: many(passHolders),
}));

export const adventuresRelations = relations(adventures, ({ one }) => ({
  season: one(seasons, { fields: [adventures.seasonId], references: [seasons.id] }),
}));

export const passHoldersRelations = relations(passHolders, ({ one }) => ({
  season: one(seasons, { fields: [passHolders.seasonId], references: [seasons.id] }),
}));
