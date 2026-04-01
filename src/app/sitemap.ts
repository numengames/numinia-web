import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { getAvatars } from '@/lib/github-storage';
import { locales } from '@/lib/i18n-config';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL + '';
  const currentDate = new Date();

  const staticPages = ['', '/archive', '/finder', '/glbinspector', '/LAP', '/legal/terms', '/legal/privacy', '/legal/cookies', '/profile'];

  const allRoutes: MetadataRoute.Sitemap = [];

  // Build hreflang alternates for a given page slug
  const buildAlternates = (page: string) =>
    Object.fromEntries(locales.map((l) => [l, `${baseUrl}/${l}${page}`]));

  // Static routes for all locales
  locales.forEach(locale => {
    staticPages.forEach(page => {
      allRoutes.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: currentDate,
        changeFrequency: page === '/archive' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/archive' ? 0.9 : 0.7,
        alternates: {
          languages: buildAlternates(page),
        },
      });
    });
  });

  // Root redirect
  allRoutes.push({
    url: baseUrl,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Dynamic asset routes
  try {
    const avatars = await getAvatars();
    for (const avatar of avatars) {
      if (!avatar.isPublic) continue;
      const slug = `/assets/${avatar.id}`;
      for (const locale of locales) {
        allRoutes.push({
          url: `${baseUrl}/${locale}${slug}`,
          lastModified: new Date(avatar.updatedAt || avatar.createdAt || currentDate),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: buildAlternates(slug),
          },
        });
      }
    }
  } catch (error) {
    console.error('Error fetching avatars for sitemap:', error);
  }

  return allRoutes;
}
