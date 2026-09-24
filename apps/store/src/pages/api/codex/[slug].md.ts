/**
 * One chapter as plain markdown — free, no login (D6): the per-chapter cut
 * of the same canonical file the reader renders.
 */
import type { APIRoute } from 'astro';
import { loadCodex } from '../../../lib/codex/source';

export const prerender = false;

export const GET: APIRoute = ({ params }) => {
  // Spanish first (the original); English slugs resolve to the English cut.
  const chapter = [...loadCodex('es').chapters, ...loadCodex('en').chapters].find(
    (entry) => entry.slug === params.slug,
  );
  if (!chapter) return new Response('No such chapter', { status: 404 });
  return new Response(chapter.raw, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="Numinia_${chapter.slug}.md"`,
      'cache-control': 'public, max-age=3600',
    },
  });
};
