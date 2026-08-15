/**
 * robots.txt — generated so the sitemap URL is absolute and always matches
 * PUBLIC_SITE_URL (which changes on deploy day without code edits).
 */

import type { APIRoute } from 'astro';
import { env } from '../lib/env';

export const GET: APIRoute = () => {
  const base = env.publicSiteUrl.replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /spike/',
    'Disallow: /api/',
    '',
    `Sitemap: ${base}/sitemap-index.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
