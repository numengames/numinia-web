/**
 * GitHub Storage Utility
 * 
 * This module provides functions to interact with GitHub as a database
 * for storing application data in JSON files.
 * 
 * FIELD NAMING CONVENTION:
 * - Application code uses camelCase (TypeScript standard)
 * - Storage/JSON uses snake_case (JSON convention)
 * - Conversion happens in this module (the API layer)
 */

import { resolveAvatarFieldsFromRaw, resolveAlternateModelsMetadata } from '@/lib/assetUrls';
import { env } from '@/lib/env';
import {
  RawUserSchema, RawProjectSchema, RawAvatarSchema,
  RawTagSchema, RawDownloadSchema, RawAvatarTagSchema,
  safeParseArray,
} from '@/lib/schemas';
// Next.js loads .env / .env.local automatically — no dotenv.config() needed.

// In-memory cache for GitHub API responses.
// TTL prevents hammering raw.githubusercontent.com on every request.
// Cache is per-serverless-instance (not shared across Vercel functions),
// but still reduces GitHub API calls significantly within a function's lifetime.
const CACHE_TTL_MS = 60 * 1000; // 1 minute
const dataCache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | undefined {
  const entry = dataCache.get(key);
  if (entry && Date.now() < entry.expiry) {
    return entry.data as T;
  }
  dataCache.delete(key);
  return undefined;
}

function setCache(key: string, data: unknown): void {
  dataCache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

// Shorthand for raw JSON objects from GitHub. Using this instead of `any`
// means we're explicit about the boundary: raw JSON properties are untyped,
// but the map callbacks that convert them produce fully-typed output.
type RawJSON = Record<string, unknown>;

// Type definitions using camelCase (for application code)
export type GithubUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

// Type definitions for projects
export type GithubProject = {
  id: string;
  name: string;
  creatorId: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  // New field from open-source-3D-assets structure
  asset_data_file?: string; // Path to asset file in assets/ folder (e.g., "pm-momuspark.json")
};

// Type definitions for avatars
export type GithubAvatar = {
  id: string;
  name: string;
  projectId: string;
  description?: string;
  thumbnailUrl?: string | null;
  modelFileUrl?: string | null;
  polygonCount?: number;
  format: string;
  materialCount?: number;
  isPublic: boolean;
  isDraft: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type GithubAvatarTag = {
  avatarId: string;
  tagId: string;
};

export type GithubDownload = {
  id: string;
  avatarId: string;
  userId?: string;
  downloadedAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
};

export type GithubTag = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// Configuration — sourced from env.ts (validated at startup, never falls back to ToxSam)
const GITHUB_OWNER  = env.github.repoOwner;
const GITHUB_REPO   = env.github.repoName;
const GITHUB_TOKEN  = env.github.token;
const GITHUB_BRANCH = env.github.branch;

// File paths in the repository
const DATA_PATHS = {
  users: 'data/users.json',
  projects: 'data/projects.json',
  avatars: 'data/avatars.json',
  tags: 'data/tags.json',
  downloads: 'data/downloads.json',
  avatarTags: 'data/avatar-tags.json',
};

// GitHub API endpoints
const API_BASE = 'https://api.github.com';
const RAW_CONTENT_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

/**
 * Fetches data from a JSON file in the GitHub repository
 * @param path Path to the JSON file in the repository
 * @returns The parsed JSON data
 */
// T is the expected shape of the JSON — callers decide the type.
// Using a generic instead of `any` means TypeScript checks the usage,
// but we still trust the GitHub API to return what we expect (no runtime Zod parsing).
async function fetchData<T = unknown>(path: string): Promise<T> {
  // Check in-memory cache first
  const cached = getCached<T>(path);
  if (cached !== undefined) return cached;

  try {
    const url = `${RAW_CONTENT_BASE}/${path}?timestamp=${Date.now()}`;
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        const isEmpty = path.includes('users') || path.includes('projects') ||
                        path.includes('avatars') || path.includes('tags') ||
                        path.includes('downloads');
        return (isEmpty ? [] : {}) as T;
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    setCache(path, data);
    return data;
  } catch (error) {
    console.error(`Error fetching from GitHub: ${path}`, error);
    throw error;
  }
}

/**
 * Updates a JSON file in the GitHub repository
 * @param path Path to the JSON file in the repository
 * @param data The data to write to the file
 * @param commitMessage Commit message for the update
 * @returns Success status
 */
async function updateData(
  path: string,
  data: unknown,
  commitMessage: string = `Update ${path}`
) {
  if (!GITHUB_TOKEN) {
    throw new Error('GitHub token is not configured. Set GITHUB_TOKEN environment variable.');
  }

  try {
    // First, get the current file (if it exists) to get its SHA
    let fileSha: string | undefined;
    
    try {
      const fileResponse = await fetch(
        `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        fileSha = fileData.sha;
      }
    } catch (error) {
      // File might not exist yet, which is fine
    }
    
    // Prepare the update content
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    
    // Create or update the file
    const updateResponse = await fetch(
      `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content,
          sha: fileSha,
          branch: GITHUB_BRANCH,
        }),
      }
    );
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(`GitHub API error: ${JSON.stringify(error)}`);
    }
    
    // Invalidate cache after successful write so next read gets fresh data
    dataCache.delete(path);
    return true;
  } catch (error) {
    console.error(`Error updating data in GitHub: ${path}`, error);
    throw error;
  }
}

/**
 * Generic function to save any data to a specified path
 * @param path The path to save the data to
 * @param data The data to save
 * @param commitMessage Optional commit message
 * @returns Success status
 */
async function saveData(
  path: string,
  data: unknown,
  commitMessage: string = `Update ${path}`
) {
  return updateData(path, data, commitMessage);
}

// Utility functions for specific data types

// Users
async function getUsers() {
  const rawData = await fetchData<unknown[]>(DATA_PATHS.users);
  const rawUsers = safeParseArray(RawUserSchema, Array.isArray(rawData) ? rawData : [], 'getUsers');

  return rawUsers.map((user): GithubUser => ({
    id: user.id,
    username: user.username,
    email: '[email protected]',
    passwordHash: '',
    role: user.role,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));
}

async function saveUsers(users: GithubUser[]) {
  // Convert camelCase to snake_case and sanitize sensitive fields
  const snakeCaseUsers = users.map((user) => ({
    id: user.id,
    username: user.username,
    email: '[email protected]', // Always sanitize email when saving
    role: user.role,
    created_at: user.createdAt,
    updated_at: user.updatedAt
  }));
  return updateData(DATA_PATHS.users, snakeCaseUsers, 'Update users data');
}

// Projects
async function getProjects() {
  const rawData = await fetchData<unknown[]>(DATA_PATHS.projects);
  const rawProjects = safeParseArray(RawProjectSchema, Array.isArray(rawData) ? rawData : [], 'getProjects');

  return rawProjects.map((project): GithubProject => ({
    id: project.id,
    name: project.name,
    creatorId: project.creator_id ?? '',
    description: project.description,
    isPublic: project.is_public,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    asset_data_file: project.asset_data_file,
  }));
}

async function saveProjects(projects: GithubProject[]) {
  // Convert camelCase to snake_case
  const snakeCaseProjects = projects.map(project => ({
    id: project.id,
    name: project.name,
    creator_id: project.creatorId,
    description: project.description,
    is_public: project.isPublic,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
    asset_data_file: project.asset_data_file
  }));
  return updateData(DATA_PATHS.projects, snakeCaseProjects, 'Update projects data');
}

// Avatars
async function getAvatars(projectIds?: string[]) {
  let allAvatars: RawJSON[] = [];
  
  try {
    // First, try the new multi-file structure from open-source-3D-assets
    // Fetch projects to see which asset files to load
    const projects = await fetchData<Record<string, unknown>[]>(DATA_PATHS.projects);
    
    if (Array.isArray(projects) && projects.length > 0) {
      // Check if any project has asset_data_file field (new structure)
      const hasAssetDataFiles = projects.some((p: RawJSON) => p.asset_data_file || p.assetDataFile || p.avatar_data_file || p.avatarDataFile);
      
      if (hasAssetDataFiles) {
        
        // Fetch assets from each project's asset file
        const avatarPromises = projects
          .filter((project: RawJSON) => {
            const avatarFile = project.asset_data_file || project.assetDataFile || project.avatar_data_file || project.avatarDataFile;
            const isPublic = project.is_public !== false;
            const hasAvatarFile = !!avatarFile;

            if (projectIds && projectIds.length > 0) {
              if (!projectIds.includes(project.id as string)) {
                return false;
              }
            }

            return hasAvatarFile && isPublic;
          })
          .map(async (project: RawJSON) => {
            const avatarFile = String(project.asset_data_file || project.assetDataFile || project.avatar_data_file || project.avatarDataFile);
            const projectId = project.id as string;
            
            try {
              // Normalize the asset file path
              // Handle cases where asset_data_file might be:
              // - Just filename: "pm-momuspark.json"
              // - With assets/ prefix: "assets/pm-momuspark.json"
              // - Full path: "data/assets/pm-momuspark.json"
              let avatarPath: string;
              if (avatarFile.startsWith('data/')) {
                // Already has full data/ prefix
                avatarPath = avatarFile;
              } else if (avatarFile.includes('/')) {
                // Has a folder prefix (assets/, avatars/, worlds/, audio/, video/)
                avatarPath = `data/${avatarFile}`;
              } else {
                // Just filename, add data/assets/ prefix (legacy)
                avatarPath = `data/assets/${avatarFile}`;
              }
              const projectAvatars = await fetchData<Record<string, unknown>[]>(avatarPath);

              if (Array.isArray(projectAvatars)) {
                
                if (projectAvatars.length === 0) {
                  console.warn(`  ⚠ File ${avatarFile} exists but is empty (0 avatars)`);
                }
                
                // Ensure all avatars have the correct project_id
                // Use the project_id from the file if it exists, otherwise use the project.id
                // This handles cases where avatar files have their own project_id values
                return projectAvatars.map((avatar: RawJSON) => ({
                  ...avatar,
                  // Keep the original project_id from the file, but ensure it's set
                  project_id: avatar.project_id || projectId
                }));
              } else {
                console.warn(`  ✗ Invalid data format from ${avatarFile}: expected array, got ${typeof projectAvatars}`);
              }
              return [];
            } catch (error) {
              console.error(`  ✗ Error fetching avatars for project ${project.name || projectId} (${avatarFile}):`, error);
              return [];
            }
          });
        
        // Wait for all avatar files to be fetched
        const avatarArrays = await Promise.all(avatarPromises);
        allAvatars = avatarArrays.flat();
        
        if (allAvatars.length === 0) {
          console.warn('⚠ No assets loaded! Check project files and asset_data_file paths.');
        }
      }
    }
    
    // Fallback: If no avatars were loaded from project files, try the old single-file structure
    if (allAvatars.length === 0) {
      const rawAvatars = await fetchData<Record<string, unknown>[]>(DATA_PATHS.avatars);
      if (Array.isArray(rawAvatars)) {
        allAvatars = rawAvatars;
      }
    }
  } catch (error) {
    console.error('Error in getAvatars, trying fallback:', error);
    // Final fallback: try the old single-file structure
    try {
      const rawAvatars = await fetchData<Record<string, unknown>[]>(DATA_PATHS.avatars);
      if (Array.isArray(rawAvatars)) {
        allAvatars = rawAvatars;
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return []; // Return empty array if everything fails
    }
  }
  
  // Convert snake_case to camelCase for compatibility; normalize GitHub / Arweave URLs
  // Support both snake_case (storage convention) and camelCase (mixed legacy data)
  const convertedAvatars = allAvatars.map((avatar: RawJSON) => {
    const resolved = resolveAvatarFieldsFromRaw({
      thumbnail_url: (avatar.thumbnail_url ?? avatar.thumbnailUrl) as string | undefined,
      model_file_url: (avatar.model_file_url ?? avatar.modelFileUrl) as string | undefined,
    });
    return {
      id: avatar.id as string,
      name: avatar.name as string,
      projectId: (avatar.project_id ?? avatar.projectId) as string,
      description: avatar.description as string | undefined,
      thumbnailUrl: resolved.thumbnailUrl,
      modelFileUrl: resolved.modelFileUrl,
      polygonCount: (avatar.polygon_count ?? avatar.polygonCount) as number | undefined,
      format: avatar.format as string,
      materialCount: (avatar.material_count ?? avatar.materialCount) as number | undefined,
      isPublic: (avatar.is_public ?? avatar.isPublic) !== false,
      isDraft: (avatar.is_draft ?? avatar.isDraft) === true,
      createdAt: (avatar.created_at ?? avatar.createdAt) as string,
      updatedAt: (avatar.updated_at ?? avatar.updatedAt) as string,
      metadata: resolveAlternateModelsMetadata((avatar.metadata || {}) as Record<string, unknown>),
    };
  });
  
  return convertedAvatars;
}

async function saveAvatars(avatars: GithubAvatar[]) {
  // Convert camelCase to snake_case
  const snakeCaseAvatars = avatars.map(avatar => ({
    id: avatar.id,
    name: avatar.name,
    project_id: avatar.projectId,
    description: avatar.description,
    thumbnail_url: avatar.thumbnailUrl,
    model_file_url: avatar.modelFileUrl,
    polygon_count: avatar.polygonCount,
    format: avatar.format,
    material_count: avatar.materialCount,
    is_public: avatar.isPublic,
    is_draft: avatar.isDraft,
    created_at: avatar.createdAt,
    updated_at: avatar.updatedAt,
    metadata: avatar.metadata
  }));
  return updateData(DATA_PATHS.avatars, snakeCaseAvatars, 'Update avatars data');
}

// Tags
async function getTags() {
  const rawData = await fetchData<unknown[]>(DATA_PATHS.tags);
  const rawTags = safeParseArray(RawTagSchema, Array.isArray(rawData) ? rawData : [], 'getTags');

  return rawTags.map((tag): GithubTag => ({
    id: tag.id,
    name: tag.name,
    createdAt: tag.created_at,
    updatedAt: tag.updated_at,
  }));
}

async function saveTags(tags: GithubTag[]) {
  // Convert camelCase to snake_case
  const snakeCaseTags = tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    created_at: tag.createdAt,
    updated_at: tag.updatedAt
  }));
  return updateData(DATA_PATHS.tags, snakeCaseTags, 'Update tags data');
}

// Downloads
async function getDownloads() {
  const rawData = await fetchData<unknown[]>(DATA_PATHS.downloads);
  const rawDownloads = safeParseArray(RawDownloadSchema, Array.isArray(rawData) ? rawData : [], 'getDownloads');

  return rawDownloads.map((download): GithubDownload => ({
    id: download.id,
    avatarId: download.avatar_id,
    userId: download.user_id,
    downloadedAt: download.downloaded_at,
    ipAddress: download.ip_address,
    userAgent: download.user_agent,
    createdAt: download.created_at,
    updatedAt: download.updated_at,
  }));
}

async function saveDownloads(downloads: GithubDownload[]) {
  // Convert camelCase to snake_case
  const snakeCaseDownloads = downloads.map(download => ({
    id: download.id,
    avatar_id: download.avatarId,
    user_id: download.userId,
    downloaded_at: download.downloadedAt,
    ip_address: download.ipAddress,
    user_agent: download.userAgent,
    created_at: download.createdAt,
    updated_at: download.updatedAt
  }));
  return updateData(DATA_PATHS.downloads, snakeCaseDownloads, 'Update downloads data');
}

// Avatar Tags
async function getAvatarTags() {
  const rawData = await fetchData<unknown[]>(DATA_PATHS.avatarTags);
  const rawAvatarTags = safeParseArray(RawAvatarTagSchema, Array.isArray(rawData) ? rawData : [], 'getAvatarTags');

  return rawAvatarTags.map((avatarTag): GithubAvatarTag => ({
    avatarId: avatarTag.avatar_id,
    tagId: avatarTag.tag_id,
  }));
}

async function saveAvatarTags(avatarTags: GithubAvatarTag[]) {
  // Convert camelCase to snake_case
  const snakeCaseAvatarTags = avatarTags.map(avatarTag => ({
    avatar_id: avatarTag.avatarId,
    tag_id: avatarTag.tagId
  }));
  return updateData(DATA_PATHS.avatarTags, snakeCaseAvatarTags, 'Update avatar tags data');
}

// Advanced query functions

/**
 * Finds an item by ID in an array of objects
 * @param items Array of items to search
 * @param id ID to find
 * @returns The found item or undefined
 */
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

type DownloadCounts = { counts: Record<string, number> };

// Function to save download counts (privacy-friendly approach)
async function saveDownloadCounts(downloadCounts: DownloadCounts): Promise<void> {
  await saveData('download-counts.json', downloadCounts);
}

async function getDownloadCounts(): Promise<DownloadCounts> {
  try {
    const data = await fetchData<DownloadCounts>('download-counts.json');
    return data || { counts: {} };
  } catch (error) {
    console.error('Error fetching download counts:', error);
    return { counts: {} };
  }
}

// Resolves the file path for a project's asset_data_file.
// Mirrors the path normalization logic in getAvatars().
function resolveAssetFilePath(assetDataFile: string): string {
  if (assetDataFile.startsWith('data/assets/') || assetDataFile.startsWith('data/avatars/')) {
    return assetDataFile;
  }
  if (assetDataFile.startsWith('assets/') || assetDataFile.startsWith('avatars/')) {
    return `data/${assetDataFile}`;
  }
  return `data/assets/${assetDataFile}`;
}

// Finds which source file an avatar lives in (by project_id), reads it,
// applies a transform, and writes it back. This is needed because getAvatars()
// reads from per-project files but saveAvatars() writes to data/avatars.json
// which is never read when multi-file structure exists.
async function modifyAvatarInSource(
  avatarId: string,
  transform: (avatars: Record<string, unknown>[]) => Record<string, unknown>[]
): Promise<boolean> {
  const projects = await fetchData<Record<string, unknown>[]>(DATA_PATHS.projects);

  for (const project of projects) {
    const assetFile = (project.asset_data_file || project.assetDataFile ||
                       project.avatar_data_file || project.avatarDataFile) as string | undefined;
    if (!assetFile) continue;

    const filePath = resolveAssetFilePath(assetFile);
    const avatars = await fetchData<Record<string, unknown>[]>(filePath);

    if (!Array.isArray(avatars)) continue;

    const index = avatars.findIndex(a => a.id === avatarId);
    if (index === -1) continue;

    const updated = transform(avatars);
    await updateData(filePath, updated, `Update avatar ${avatarId}`);
    return true;
  }

  return false;
}

// Updates specific fields of an avatar in its source file.
async function updateAvatarInSource(
  avatarId: string,
  updates: Record<string, unknown>
): Promise<boolean> {
  return modifyAvatarInSource(avatarId, (avatars) =>
    avatars.map(a => a.id === avatarId ? { ...a, ...updates, updated_at: new Date().toISOString() } : a)
  );
}

// Removes an avatar from its source file.
async function deleteAvatarFromSource(avatarId: string): Promise<boolean> {
  return modifyAvatarInSource(avatarId, (avatars) =>
    avatars.filter(a => a.id !== avatarId)
  );
}

// Explicitly export all functions at the end
export {
  fetchData,
  saveData,
  updateData,
  getUsers,
  saveUsers,
  getProjects,
  saveProjects,
  getAvatars,
  saveAvatars,
  getTags,
  saveTags,
  getDownloads,
  saveDownloads,
  getAvatarTags,
  saveAvatarTags,
  findById,
  saveDownloadCounts,
  getDownloadCounts,
  updateAvatarInSource,
  deleteAvatarFromSource,
}; 