/**
 * Route resolution for /lap/codex/[chapter] (D8). Redirects can only be
 * issued by the PAGE component in Astro, so the decision lives here and
 * every locale page applies it in one line.
 */
import { loadCodex } from './source.js';

export type CodexRoute =
  | { readonly kind: 'chapter'; readonly slug: string }
  | { readonly kind: 'redirect'; readonly to: string; readonly permanent: boolean };

export function resolveCodexRoute(slug: string, prefix: string): CodexRoute {
  const { chapters } = loadCodex();
  // Legacy reader ids (capitulo-N) keep resolving: URLs are promises.
  const legacy = /^capitulo-(\d)$/.exec(slug);
  if (legacy) {
    const target = chapters.find((entry) => entry.number === Number(legacy[1]));
    if (target) {
      return { kind: 'redirect', to: `${prefix}/lap/codex/${target.slug}/`, permanent: true };
    }
  }
  if (!chapters.some((entry) => entry.slug === slug)) {
    return { kind: 'redirect', to: `${prefix}/lap/codex/`, permanent: false };
  }
  return { kind: 'chapter', slug };
}
