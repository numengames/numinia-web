import { MetadataRoute } from 'next';
import { getAvatars } from '@/lib/github-storage';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://numinia.store';
  const currentDate = new Date();
  const locales = ['en', 'ja'];

  const staticPages = ['', '/archive', '/finder', '/glbinspector', '/LAP', '/legal/terms', '/legal/privacy', '/legal/cookies', '/profile'];

  const allRoutes: MetadataRoute.Sitemap = [];

  // Static routes for both locales
  locales.forEach(locale => {
    staticPages.forEach(page => {
      allRoutes.push({
        url: `${baseUrl}/${locale}${page}`,
        lastModified: currentDate,
        changeFrequency: page === '/archive' ? 'daily' : 'weekly',
        priority: page === '' ? 1.0 : page === '/archive' ? 0.9 : 0.7,
        alternates: {
          languages: {
            en: `${baseUrl}/en${page}`,
            ja: `${baseUrl}/ja${page}`,
          }
        }
      });
    });
  });

  // Root
  allRoutes.push({
    url: baseUrl,
    lastModified: currentDate,
    changeFrequency: 'daily',
    priority: 1.0,
  });

  // Dynamic asset routes — uses the same data source as the gallery
  try {
    const avatars = await getAvatars();
    for (const avatar of avatars) {
      if (!avatar.isPublic) continue;
      for (const locale of locales) {
        allRoutes.push({
          url: `${baseUrl}/${locale}/assets/${avatar.id}`,
          lastModified: new Date(avatar.updatedAt || avatar.createdAt || currentDate),
          changeFrequency: 'weekly',
          priority: 0.8,
          alternates: {
            languages: {
              en: `${baseUrl}/en/assets/${avatar.id}`,
              ja: `${baseUrl}/ja/assets/${avatar.id}`,
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching avatars for sitemap:', error);
  }

  return allRoutes;
}
