/**
 * The whole book as plain markdown — free, no login, ever (D6). The gate
 * veils the READER, never the text: the Umbral is a funnel, not a wall.
 */
import type { APIRoute } from 'astro';
import { codexSourceText } from '../../../lib/codex/source';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(codexSourceText(), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': 'attachment; filename="Numinia_Manual_del_juego_de_rol_v0_6_0.md"',
      'cache-control': 'public, max-age=3600',
    },
  });
