/**
 * The character-sheet annex as plain markdown — free like the sheet itself
 * (D15): the canonical transcription of Hoja_de_PJ_v0_6_0, to take away.
 */
import type { APIRoute } from 'astro';
import { loadCodexDoc } from '../../../lib/codex/docs';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(loadCodexDoc('hoja-de-personaje'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="Numinia_Hoja_de_Personaje_v0_6_0.md"',
      'cache-control': 'public, max-age=3600',
    },
  });
