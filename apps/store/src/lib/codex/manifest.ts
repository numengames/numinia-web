/**
 * Codex manifest (MIS-085 Phase A): the build-time contract over the split.
 * Zod-validated so a structural drift in the source manual fails the build
 * loudly instead of silently shipping a broken Códex (constitution rule:
 * validate all external data).
 */
import { z } from 'zod';

import type { CodexChapter } from './parse.js';

/** Version of the canonical manual file this pipeline expects (D8: version
 * travels in the manifest and the colophon, never in the URL). */
export const MANUAL_VERSION = '0.6.0';

export const CodexChapterMetaSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  number: z.number().int().min(1).max(7).nullable(),
  access: z.enum(['public', 'gated']),
});
export type CodexChapterMeta = z.infer<typeof CodexChapterMetaSchema>;

export const CodexManifestSchema = z.object({
  version: z.literal(MANUAL_VERSION),
  chapters: z.array(CodexChapterMetaSchema).min(9),
});
export type CodexManifest = z.infer<typeof CodexManifestSchema>;

export function buildManifest(chapters: readonly CodexChapter[]): CodexManifest {
  const numbers = chapters
    .map((chapter) => chapter.number)
    .filter((number): number is number => number !== null);
  for (let expected = 1; expected <= 7; expected += 1) {
    if (!numbers.includes(expected)) {
      throw new Error(`buildManifest: chapter ${expected} is missing from the source.`);
    }
  }
  const slugs = new Set(chapters.map((chapter) => chapter.slug));
  if (slugs.size !== chapters.length) {
    throw new Error('buildManifest: chapter slugs are not unique.');
  }
  return CodexManifestSchema.parse({
    version: MANUAL_VERSION,
    chapters: chapters.map(({ slug, title, number, access }) => ({
      slug,
      title,
      number,
      access,
    })),
  });
}
