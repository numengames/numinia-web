/**
 * The house's sites the footer names, in the order a visitor reads them:
 * the company, the game, the archive. The current site is rendered as
 * text, not a link.
 *
 * numinia.com's app shell (the Oracle's design, 2026-10-14) folds the
 * footer into the sidebar and names only these three: NWOS, GitHub and
 * Discord left it. The other three sites still list four entries; the
 * shared standard (STD-037) is updated in the archive afterwards.
 */
export interface HouseLink {
  readonly id: 'company' | 'game' | 'archive';
  readonly label: string;
  readonly what: string;
  readonly href: string;
}

export const HOUSE_LINKS: readonly HouseLink[] = [
  { id: 'company', label: 'Numen Games', what: 'the company', href: 'https://numen.games' },
  { id: 'game', label: 'Numinia', what: 'the game', href: 'https://numinia.com' },
  {
    id: 'archive',
    label: 'The Archive',
    what: 'the archive, built in public',
    href: 'https://numinia.org',
  },
];

/** Which of the three this site is. */
export const THIS_SITE: HouseLink['id'] = 'game';
