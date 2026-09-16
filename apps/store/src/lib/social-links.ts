/**
 * The house's social accounts, the same on the three sites (numinia.org,
 * numinia.com, numen.games). Empty until the Oracle hands over the company
 * URLs (X, Discord, GitHub): with an empty list the footer draws no Social
 * column. Never personal accounts.
 */
export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [];
