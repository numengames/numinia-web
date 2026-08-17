/**
 * One chapter as plain markdown — free, no login (D6): the per-chapter cut
 * of the same canonical file the reader renders.
 */
import type { APIRoute } from 'astro';
import { loadCodex } from '../../../lib/codex/source';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  const chapter = loadCodex().chapters.find((entry) => entry.slug === params.slug);
  if (!chapter) return new Response('No such chapter', { status: 404 });
  return new Response(chapter.raw, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="Numinia_${chapter.slug}.md"`,
      'cache-control': 'public, max-age=3600',
    },
  });
};
