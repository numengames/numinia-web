/**
 * The character-sheet annex of the English edition as plain markdown —
 * free like the sheet itself (D15). Carries the Spanish sheet until the
 * English one (lore/codex/en/character-sheet.md) lands in the archive.
 */
import type { APIRoute } from 'astro';
import { CODEX_UI } from '../../../i18n/codex';
import { loadCodexDoc } from '../../../lib/codex/docs';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(loadCodexDoc('hoja-de-personaje', 'en'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${CODEX_UI.en.sheet.downloadFile}"`,
      'cache-control': 'public, max-age=3600',
    },
  });
