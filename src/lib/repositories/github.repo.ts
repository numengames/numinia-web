/**
 * GitHub repository implementation — wraps existing github-storage.ts.
 *
 * This is the "adapter" that makes the existing GitHub-as-DB code
 * conform to the repository interfaces. No logic changes — just delegation.
 */

import {
  getAvatars, saveAvatars, updateAvatarInSource, deleteAvatarFromSource,
  getProjects, saveProjects,
  getUsers, saveUsers,
  getTags, saveTags,
  getAvatarTags, saveAvatarTags,
  getDownloadCounts, saveDownloadCounts,
  fetchData,
  findById,
} from '@/lib/github-storage';
import type { GithubAvatar, GithubProject, GithubUser, GithubTag, GithubAvatarTag } from '@/lib/github-storage';
import type {
  IAssetRepository, IProjectRepository, IUserRepository,
  ITagRepository, IAssetTagRepository, IDownloadCountRepository,
  ICharacterRepository, IPortalRepository, IDataSource,
  DownloadCounts,
} from './types';

/* ────────────────────────── Assets ────────────────────────── */

class GitHubAssetRepository implements IAssetRepository {
  async getAll(projectIds?: string[]): Promise<GithubAvatar[]> {
    return getAvatars(projectIds);
  }

  async getById(id: string): Promise<GithubAvatar | undefined> {
    const all = await getAvatars();
    return findById(all, id);
  }

  async create(asset: GithubAvatar): Promise<GithubAvatar> {
    const all = await getAvatars() as GithubAvatar[];
    all.push(asset);
    await saveAvatars(all);
    return asset;
  }

  async update(id: string, updates: Record<string, unknown>): Promise<boolean> {
    return updateAvatarInSource(id, updates);
  }

  async delete(id: string): Promise<boolean> {
    return deleteAvatarFromSource(id);
  }

  async saveAll(avatars: GithubAvatar[]): Promise<void> {
    await saveAvatars(avatars);
  }
}

/* ────────────────────────── Projects ────────────────────────── */

class GitHubProjectRepository implements IProjectRepository {
  async getAll(): Promise<GithubProject[]> {
    return getProjects();
  }

  async getById(id: string): Promise<GithubProject | undefined> {
    const all = await getProjects();
    return findById(all, id);
  }

  async saveAll(projects: GithubProject[]): Promise<void> {
    await saveProjects(projects);
  }
}

/* ────────────────────────── Users ────────────────────────── */

class GitHubUserRepository implements IUserRepository {
  async getAll(): Promise<GithubUser[]> {
    return getUsers();
  }

  async getById(id: string): Promise<GithubUser | undefined> {
    const all = await getUsers();
    return findById(all, id);
  }

  async getByWalletAddress(_address: string): Promise<GithubUser | undefined> {
    // GitHub storage doesn't have wallet_address field on users natively
    return undefined;
  }

  async getByGithubId(githubId: string): Promise<GithubUser | undefined> {
    const all = await getUsers();
    return all.find(u => u.id === githubId);
  }

  async saveAll(users: GithubUser[]): Promise<void> {
    await saveUsers(users);
  }
}

/* ────────────────────────── Tags ────────────────────────── */

class GitHubTagRepository implements ITagRepository {
  async getAll(): Promise<GithubTag[]> {
    return getTags();
  }

  async saveAll(tags: GithubTag[]): Promise<void> {
    await saveTags(tags);
  }
}

/* ────────────────────────── Asset Tags ────────────────────────── */

class GitHubAssetTagRepository implements IAssetTagRepository {
  async getAll(): Promise<GithubAvatarTag[]> {
    return getAvatarTags();
  }

  async saveAll(assetTags: GithubAvatarTag[]): Promise<void> {
    await saveAvatarTags(assetTags);
  }
}

/* ────────────────────────── Download Counts ────────────────────────── */

class GitHubDownloadCountRepository implements IDownloadCountRepository {
  async getAll(): Promise<DownloadCounts> {
    return getDownloadCounts();
  }

  async saveAll(counts: DownloadCounts): Promise<void> {
    await saveDownloadCounts(counts);
  }

  async increment(assetId: string): Promise<void> {
    const data = await getDownloadCounts();
    data.counts[assetId] = (data.counts[assetId] || 0) + 1;
    await saveDownloadCounts(data);
  }
}

/* ────────────────────────── Characters ────────────────────────── */

class GitHubCharacterRepository implements ICharacterRepository {
  async getByWallet(address: string): Promise<{ exists: boolean; content: string | null }> {
    try {
      const content = await fetchData<string>(`data/characters/${address.toLowerCase()}.md`);
      if (content) return { exists: true, content: content as string };
      return { exists: false, content: null };
    } catch {
      return { exists: false, content: null };
    }
  }

  async save(_address: string, _content: string): Promise<void> {
    // Character save uses GitHub API directly in the route handler
    // (needs SHA for update). Kept in route for now.
    throw new Error('Character save not implemented in GitHub repo — use route handler directly');
  }
}

/* ────────────────────────── Portals ────────────────────────── */

class GitHubPortalRepository implements IPortalRepository {
  async getData(): Promise<unknown> {
    return fetchData('data/portals/numinia-portals.json');
  }
}

/* ────────────────────────── Factory ────────────────────────── */

export function createGitHubDataSource(): IDataSource {
  return {
    assets: new GitHubAssetRepository(),
    projects: new GitHubProjectRepository(),
    users: new GitHubUserRepository(),
    tags: new GitHubTagRepository(),
    assetTags: new GitHubAssetTagRepository(),
    downloadCounts: new GitHubDownloadCountRepository(),
    characters: new GitHubCharacterRepository(),
    portals: new GitHubPortalRepository(),
  };
}
