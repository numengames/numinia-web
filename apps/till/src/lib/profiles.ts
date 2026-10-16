/**
 * What numinia.com sends to publish a name and an avatar (cut «Tu nombre y
 * tu cara», 2026-10-16), read as untrusted. Pure — no database. A malformed
 * field is a problem in words, never a throw; the desk refuses with them and
 * writes nothing.
 *
 * A name is what fellow members will read instead of a short wallet, so it
 * must read as itself: trimmed, 1 to 60 characters as people count them
 * (`Array.from`, an emoji is one), at least one that shows, and no control
 * character or direction override that could hide it or make it read as
 * another. An avatar is the id of one of the Bazar's avatars — the asset id,
 * never a picture — or null; numinia.com checks it against the Bazar's own
 * list, the till only its shape.
 */

/** The longest name, in characters as `Array.from` counts them (migration 0006's CHECK). */
export const PROFILE_NAME_MAX = 60;

/** The longest avatar id (migration 0006's CHECK). */
export const AVATAR_ID_MAX = 64;

export const PROFILE_PROBLEMS = {
  change: 'change must be an object with name and avatar, or null to stop showing them',
  name: `name must be 1 to ${PROFILE_NAME_MAX} characters, at least one of them visible, none of them a control character or a direction override`,
  avatar: 'avatar must be the id of an avatar of the Bazar, or null',
} as const;

/** C0, DEL and C1: nothing a screen should print in a name. */
// eslint-disable-next-line no-control-regex -- a name never holds a control character
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/** The direction embeddings and overrides, and the isolates: they can make a name read as another. */
const DIRECTION = /[\u202a-\u202e\u2066-\u2069]/;

/** A letter, a number, a punctuation mark or a symbol: something that shows. */
const SHOWS = /[\p{L}\p{N}\p{P}\p{S}]/u;

/** An asset id as the Bazar writes them: lowercase letters, digits and hyphens. */
const AVATAR_ID = new RegExp(`^[a-z0-9][a-z0-9-]{0,${AVATAR_ID_MAX - 1}}$`);

/** What a person publishes: a name, and an avatar or none. */
export interface ProfileChange {
  readonly name: string;
  readonly avatar: string | null;
}

/** A name, trimmed, when it may be shown; undefined otherwise. */
export function readProfileName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  const length = Array.from(name).length;
  return length >= 1 &&
    length <= PROFILE_NAME_MAX &&
    !CONTROL.test(name) &&
    !DIRECTION.test(name) &&
    SHOWS.test(name)
    ? name
    : undefined;
}

/** An avatar's id, or null for none; undefined when it is neither. */
export function readAvatarId(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' && AVATAR_ID.test(value) ? value : undefined;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const FIELDS: readonly string[] = ['name', 'avatar'];

/**
 * A change of one's profile: `{ name, avatar }` to publish or replace it —
 * both said, nothing else — or null to stop showing them. The problems of
 * every wrong field otherwise.
 */
export function readProfileChange(value: unknown): ProfileChange | null | string[] {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !FIELDS.includes(key)) ||
    value['name'] === undefined ||
    value['avatar'] === undefined
  ) {
    return [PROFILE_PROBLEMS.change];
  }
  const name = readProfileName(value['name']);
  const avatar = readAvatarId(value['avatar']);
  if (name === undefined || avatar === undefined) {
    return [
      ...(name === undefined ? [PROFILE_PROBLEMS.name] : []),
      ...(avatar === undefined ? [PROFILE_PROBLEMS.avatar] : []),
    ];
  }
  return { name, avatar };
}
