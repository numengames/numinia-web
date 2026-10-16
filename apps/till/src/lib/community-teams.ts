/**
 * A community's organization (cut «Una comunidad ES una organización»,
 * 2026-10-16), the pure part: the community id numinia.com sends, read as
 * untrusted; the till account id worked out from it; the words of the
 * refusals. Pure — no database. A malformed field is a problem in words,
 * never a throw.
 */

/** A register page's id: lowercase letters, digits and hyphens, never leading with one. */
const COMMUNITY_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

export const COMMUNITY_PROBLEMS = {
  notHouse: 'only the house opens the organization of a community',
  community:
    'communityId must be 1 to 63 characters: lowercase letters, digits and hyphens, not starting with a hyphen',
} as const;

/** A community id as the register writes it, or undefined. */
export function readCommunityId(value: unknown): string | undefined {
  return typeof value === 'string' && COMMUNITY_ID.test(value) ? value : undefined;
}

/**
 * The till account of a community: derived from its id, so two first calls
 * at once make one account and the id never has to be kept anywhere. The
 * same shape as a founded organization's random id: `acc_t_` and 32 hex.
 */
export async function communityAccountId(communityId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`numinia-till community ${communityId}`),
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0'));
  return `acc_t_${hex.join('').slice(0, 32)}`;
}
