/**
 * The house's social accounts, the same list on the four sites (a copy per
 * repository, no shared package yet). GitHub is the organisation's; Discord
 * is the server "Numinia" (invite verified, Oracle 2026-10-03); X is added
 * when the Oracle hands over the company URL. Never personal accounts.
 */
export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/numengames' },
  { label: 'Discord', href: 'https://discord.gg/ASwwdd24pp' },
];
