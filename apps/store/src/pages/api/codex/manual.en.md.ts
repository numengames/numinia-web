/**
 * The whole book in its English edition as plain markdown — free, no login,
 * ever (D6), like the Spanish original at /api/codex/manual.md. Until the
 * English corpus is fetched the English edition is the Spanish text (see
 * lib/codex/source.ts), never an empty file.
 */
import type { APIRoute } from 'astro';
import { codexBookBase } from '../../../i18n/codex';
import { MANUAL_VERSION } from '../../../lib/codex/manifest';
import { codexSourceText } from '../../../lib/codex/source';

export const prerender = false;

export const GET: APIRoute = () =>
  new Response(codexSourceText('en'), {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${codexBookBase('en', MANUAL_VERSION)}.md"`,
      'cache-control': 'public, max-age=3600',
    },
  });
