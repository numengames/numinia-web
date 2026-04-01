import { NextRequest, NextResponse } from 'next/server';
import { getAvatars, getProjects, saveAvatars } from '@/lib/github-storage';
import { GithubAvatar, GithubProject } from '@/types/github-storage';
import { getAdminSession, requireRank, type SessionWithRank } from '@/lib/auth/getSession';
import { generateAssetId } from '@/lib/asset-id';
import { isAllowedAssetUrl } from '@/lib/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('search');
    const assetName = searchParams.get('assetName'); // Fetch specific asset by name (e.g. for hero)
    const projectIdsParam = searchParams.get('projectIds');
    
    // Parse projectIds if provided (comma-separated list)
    const projectIds = projectIdsParam 
      ? projectIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      : undefined;
    
    // assetName takes precedence over search when both could apply
    const effectiveSearch = assetName ?? search;
    

    // Check if user is authenticated (wallet or GitHub OAuth)
    const { isAdmin } = getAdminSession(req);

    // Fetch avatars and projects from GitHub storage
    // If projectIds is provided, only fetch avatars from those projects
    const [avatars, projects] = await Promise.all([
      getAvatars(projectIds),
      getProjects()
    ]);


    // Filter avatars based on search criteria and visibility
    const filteredAvatars = avatars.filter((avatar: GithubAvatar) => {
      // If user is admin, show all avatars
      // Otherwise, only show public avatars (default to true if not specified)
      if (!isAdmin && avatar.isPublic === false) return false;
      
      // Filter by search term if provided
      if (effectiveSearch) {
        const searchLower = effectiveSearch.toLowerCase();
        return (
          avatar.name.toLowerCase().includes(searchLower) ||
          (avatar.description || '').toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
    
    // Sort by created date (newest first)
    const sortedAvatars = filteredAvatars.sort((a: GithubAvatar, b: GithubAvatar) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });


    // Get project names for each avatar
    const projectMap = new Map<string, GithubProject>();
    projects.forEach((project: GithubProject) => {
      projectMap.set(project.id, project);
    });

    const transformedAvatars = sortedAvatars.map((avatar: GithubAvatar) => {
      // getAvatars() already resolves GitHub blob URLs, relative paths, and Arweave mappings
      const project = projectMap.get(avatar.projectId);

      return {
        id: avatar.id,
        name: avatar.name,
        project: project?.name || 'Unknown Project',
        projectId: avatar.projectId, // Include projectId for filtering
        description: avatar.description || '',
        createdAt: avatar.createdAt,
        thumbnailUrl: avatar.thumbnailUrl,
        modelFileUrl: avatar.modelFileUrl,
        polygonCount: avatar.polygonCount || 0,
        format: avatar.format,
        materialCount: avatar.materialCount || 0,
        isPublic: avatar.isPublic,
        isDraft: avatar.isDraft,
        metadata: avatar.metadata || {},
        // v1 schema fields for admin
        storage: avatar.storage,
        status: avatar.status,
        version: avatar.version,
        file_size_bytes: avatar.file_size_bytes,
        canonical: avatar.canonical,
        nft: avatar.nft,
        license: avatar.license,
        creator: avatar.creator,
        tags: avatar.tags || [],
      };
    });

    type PublicProject = {
      id: string; name: string; description?: string; isPublic: boolean;
      license: string; createdAt: string; updatedAt: string; avatarCount: number;
    };

    // Prepare projects data for frontend
    const publicProjects = projects
      .filter((project: GithubProject) => project.isPublic)
      .map((project: GithubProject): PublicProject => ({
        id: project.id,
        name: project.name,
        description: project.description,
        isPublic: project.isPublic,
        license: project.license || 'CC0', // Include license, default to CC0
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        avatarCount: transformedAvatars.filter((a) => a.projectId === project.id).length
      }))
      .sort((a: PublicProject, b: PublicProject) => a.name.localeCompare(b.name));

    // Debug: Log project ID distribution
    const projectIdCounts = transformedAvatars.reduce((acc: Record<string, number>, avatar) => {
      acc[avatar.projectId] = (acc[avatar.projectId] || 0) + 1;
      return acc;
    }, {});

    const response = NextResponse.json({
      avatars: transformedAvatars,
      projects: publicProjects, // Include projects in response
      _debug: {
        timestamp: new Date().toISOString(),
        count: transformedAvatars.length,
        projectCount: publicProjects.length,
        storage: 'github+arweave', // Indicate that we're using GitHub + Arweave
        projectIdCounts // Include project ID distribution for debugging
      }
    });
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error) {
    console.error('Error fetching avatars:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch avatars',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let session: SessionWithRank;
    try {
      session = await requireRank(req, 'archon');
    } catch (response) {
      return response as Response;
    }
    
    // Parse the request body
    const avatarData = await req.json();
    
    // Validate required fields
    if (!avatarData.name || !avatarData.projectId) {
      return NextResponse.json(
        { error: 'Name and projectId are required' },
        { status: 400 }
      );
    }
    
    // Create a new avatar object
    const now = new Date().toISOString();
    const newAvatar: GithubAvatar = {
      id: generateAssetId(),
      name: avatarData.name,
      projectId: avatarData.projectId,
      description: avatarData.description ?? '',
      thumbnailUrl: avatarData.thumbnailUrl ?? '',
      modelFileUrl: (() => {
        const url = avatarData.modelFileUrl ?? '';
        if (url && !isAllowedAssetUrl(url)) throw new Error('Invalid asset URL host');
        return url;
      })(),
      polygonCount: avatarData.polygonCount ?? 0,
      format: avatarData.format || 'VRM',
      materialCount: avatarData.materialCount ?? 0,
      isPublic: avatarData.isPublic === true,
      isDraft: avatarData.isDraft !== false,
      metadata: avatarData.metadata || {},
      createdAt: now,
      updatedAt: now
    };
    
    // Get current avatars and add the new one
    const avatars: GithubAvatar[] = await getAvatars() as GithubAvatar[];
    avatars.push(newAvatar);
    
    // Save the updated avatars array
    await saveAvatars(avatars);
    
    return NextResponse.json(newAvatar, { status: 201 });
  } catch (error) {
    console.error('Error creating avatar:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create avatar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}