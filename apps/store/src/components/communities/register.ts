/**
 * The register as the pages read it: every file under
 * src/content/communities/ parsed at build time, once. A bad file throws
 * here with its name, and the build stops — never a half page.
 *
 * Only the pure model lives in lib/communities.ts (unit-tested to 100 %);
 * this module is the glob that feeds it.
 */

import {
  byName,
  byStart,
  idFromPath,
  parseCommunity,
  parseRitual,
  published,
  type Community,
  type Ritual,
} from '../../lib/communities';

interface MarkdownModule {
  readonly frontmatter: unknown;
}

const communityModules = import.meta.glob<MarkdownModule>('../../content/communities/*.md', {
  eager: true,
});
const ritualModules = import.meta.glob<MarkdownModule>('../../content/communities/rituals/*.md', {
  eager: true,
});

/** Every community on file, the founder first, then by name — prepared ones included. */
export const REGISTER: readonly Community[] = Object.entries(communityModules)
  .map(([path, module]) => parseCommunity(idFromPath(path), module.frontmatter))
  .sort(byName);

/** The communities the site shows. */
export const COMMUNITIES: readonly Community[] = published(REGISTER);

const knownIds = new Set(REGISTER.map((community) => community.id));
const publishedIds = new Set(COMMUNITIES.map((community) => community.id));

/** The rituals of the published communities, by date. */
export const RITUALS: readonly Ritual[] = Object.entries(ritualModules)
  .map(([path, module]) => {
    const ritual = parseRitual(idFromPath(path), module.frontmatter);
    if (!knownIds.has(ritual.community)) {
      throw new Error(`rituals/${ritual.id}.md: no community "${ritual.community}" on file`);
    }
    return ritual;
  })
  .filter((ritual) => publishedIds.has(ritual.community))
  .sort(byStart);

export function communityOf(id: string): Community {
  const community = COMMUNITIES.find((entry) => entry.id === id);
  if (!community) throw new Error(`no published community "${id}"`);
  return community;
}
