/**
 * A world's own page (v3 cut K, 2026-10-17): the pure rules the page asks
 * before it draws — which encounters happen in this world, what its lead
 * says, what its machine sheet may say, and how «Compartir» behaves.
 *
 * Encounters carry no world of their own. One belongs to a world when the
 * community that keeps it says so in the only two ways the register can:
 * its `sede` is that world's address, or the encounter is online and the
 * community has exactly one world — then it can only be there. Anything
 * else is left out: never a guess. The page hands in what it read.
 */

import { pick, upcoming, type Community, type Ritual } from './communities';
import { readableWorldName } from './world-index';

/** The world as the page knows it: its id, where it is served, and which community it is in. */
export interface PageWorld {
  readonly id: string;
  readonly domain: string | null;
  readonly community: string;
}

/** The host of an https address, lowercased; null for anything else. */
export function hostOf(href: string | undefined): string | null {
  if (href === undefined) return null;
  const host = /^https:\/\/([a-z0-9.-]+)(?:[/:?#]|$)/i.exec(href)?.[1];
  return host === undefined ? null : host.toLowerCase();
}

/**
 * Whether one encounter happens in this world: its community's `sede` is
 * the world's address, or it is online and this is its community's only
 * world. `communityWorlds` are the ids of the worlds that community has.
 */
export function belongsToWorld(
  ritual: Ritual,
  community: Community | undefined,
  world: PageWorld,
  communityWorlds: readonly string[],
): boolean {
  if (community === undefined || ritual.community !== community.id) return false;
  const sede = hostOf(community.sede?.href);
  if (sede !== null && world.domain !== null && sede === world.domain.toLowerCase()) return true;
  return (
    ritual.mode === 'online' && communityWorlds.length === 1 && communityWorlds[0] === world.id
  );
}

/**
 * The upcoming encounters of a world, the nearest first (belongsToWorld,
 * for each ritual of the register). `worlds` is every world the index
 * lists with its community, so a community's count of worlds is read, not
 * guessed.
 */
export function worldEncounters(
  world: PageWorld,
  worlds: readonly { readonly id: string; readonly community: string }[],
  communities: readonly Community[],
  rituals: readonly Ritual[],
): readonly Ritual[] {
  const community = communities.find((entry) => entry.id === world.community);
  const own = worlds
    .filter((entry) => entry.community === world.community)
    .map((entry) => entry.id);
  return upcoming(rituals).filter((ritual) => belongsToWorld(ritual, community, world, own));
}

/**
 * The lead under the title: what the world is, as its community's file says
 * it (the community's summary — a sede has a name, never a summary of its
 * own), then whose it is. `{x}` in `keptBy`/`homeOf` is the community's
 * name, which the page links.
 */
export function worldLead(community: Community, locale: string): string {
  return pick(community.summary, locale);
}

/**
 * The machine sheet: what the fleet says of the machine that runs the
 * world. Today the fleet names the machine and nothing else a visitor should
 * read (no provider, no data centre, no ping, no uptime): the sheet is one
 * line, «Corre en {machine}», with the machine's alias read as words — never
 * a hex id. A world run by hand (no machine named) has no sheet.
 */
export function machineSheet(alias: string | null): { readonly name: string } | null {
  if (alias === null || alias.trim() === '') return null;
  return { name: readableWorldName(alias) };
}

/** What a page can share: the browser's share sheet, or the clipboard. */
export interface ShareTools {
  readonly share:
    ((data: { readonly title: string; readonly url: string }) => Promise<void>) | null;
  readonly copy: ((text: string) => Promise<void>) | null;
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/**
 * «Compartir»: the Web Share API where the browser has it; the clipboard
 * where it does not, so the page can say «Enlace copiado»; a share sheet the
 * person closed is nothing to report (`shared`). Never throws.
 */
export async function shareLink(
  tools: ShareTools,
  title: string,
  url: string,
): Promise<ShareOutcome> {
  if (tools.share !== null) {
    try {
      await tools.share({ title, url });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
    }
  }
  if (tools.copy === null) return 'failed';
  try {
    await tools.copy(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** The page's share tools from a window's navigator, bound so they can be called apart. */
export function shareToolsOf(nav: Navigator | undefined): ShareTools {
  const share = nav !== undefined && typeof nav.share === 'function' ? nav.share.bind(nav) : null;
  const clipboard = nav?.clipboard;
  const copy =
    clipboard !== undefined && typeof clipboard.writeText === 'function'
      ? clipboard.writeText.bind(clipboard)
      : null;
  return { share, copy };
}
