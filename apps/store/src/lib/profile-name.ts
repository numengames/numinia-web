/**
 * «Tu nombre en la ciudad» (cut «Tu nombre y tu cara», 2026-10-16): the
 * little rules the settings section and the fixture desk need. Pure — no DOM,
 * no storage, no zod (it ships in the section's script).
 *
 * The rules of a name and an avatar id are the till's (apps/till
 * src/lib/profiles.ts): the till decides, and the store mirrors them so the
 * fixture desk answers as the till does and the section can say what is
 * wrong before anything is sent. A test runs both over one corpus and pins
 * the till's sentences.
 */

import { citizenFromMarkdown } from './citizen-profile';
import { readOwnProfile, type DeskProfileChange, type OwnProfile } from './accounts';

/** The longest name, in characters as `Array.from` counts them (the till's CHECK). */
export const PROFILE_NAME_MAX = 60;

/** The longest avatar id (the till's CHECK). */
const AVATAR_ID_MAX = 64;

// The till's own words (apps/till src/lib/profiles.ts PROFILE_PROBLEMS, pinned by a test).
export const PROFILE_CHANGE_PROBLEM =
  'change must be an object with name and avatar, or null to stop showing them';
export const PROFILE_NAME_PROBLEM = `name must be 1 to ${PROFILE_NAME_MAX} characters, at least one of them visible, none of them a control character or a direction override`;
export const PROFILE_AVATAR_PROBLEM = 'avatar must be the id of an avatar of the Bazar, or null';

// eslint-disable-next-line no-control-regex -- a name never holds a control character
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
const DIRECTION = /[\u202a-\u202e\u2066-\u2069]/;
const SHOWS = /[\p{L}\p{N}\p{P}\p{S}]/u;
const AVATAR_ID = new RegExp(`^[a-z0-9][a-z0-9-]{0,${AVATAR_ID_MAX - 1}}$`);

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

const FIELDS: readonly string[] = ['name', 'avatar'];

/** A change as the till reads it: `{ name, avatar }`, null to stop showing them, or the problems. */
export function readProfileChange(value: unknown): DeskProfileChange | string[] {
  if (value === null) return null;
  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !FIELDS.includes(key))
  ) {
    return [PROFILE_CHANGE_PROBLEM];
  }
  const fields = value as Readonly<Record<string, unknown>>;
  if (fields['name'] === undefined || fields['avatar'] === undefined) {
    return [PROFILE_CHANGE_PROBLEM];
  }
  const name = readProfileName(fields['name']);
  const avatar = readAvatarId(fields['avatar']);
  if (name === undefined || avatar === undefined) {
    return [
      ...(name === undefined ? [PROFILE_NAME_PROBLEM] : []),
      ...(avatar === undefined ? [PROFILE_AVATAR_PROBLEM] : []),
    ];
  }
  return { name, avatar };
}

/** Which of the till's refusals the section has its own words for. */
export type ProfileProblemKey = 'name' | 'avatar' | 'other';

export function profileProblem(problems: readonly unknown[]): ProfileProblemKey {
  if (problems.includes(PROFILE_NAME_PROBLEM)) return 'name';
  if (problems.includes(PROFILE_AVATAR_PROBLEM)) return 'avatar';
  return 'other';
}

/**
 * The name the input starts with: the published one, else the name of the
 * citizen profile kept on this device (`record`, the sheet's own record) —
 * only a suggestion in the person's own browser: nothing is sent until they
 * press «Guardar».
 */
export function prefillName(profile: OwnProfile | null, record: string | null): string {
  return profile?.name ?? citizenFromMarkdown(record ?? '').name;
}

/** What an answer of /api/profile means to the section. */
export type ProfileOutcome =
  | { readonly kind: 'profile'; readonly profile: OwnProfile | null }
  | { readonly kind: 'problem'; readonly problem: ProfileProblemKey }
  | { readonly kind: 'signed-out' }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'failed' };

/** The section's next state from a status and a body: a profile, a problem to say, or why not. */
export function profileOutcome(status: number, json: unknown): ProfileOutcome {
  if (status === 200) {
    const read = readOwnProfile(json);
    return read === null ? { kind: 'failed' } : { kind: 'profile', profile: read.profile };
  }
  if (status === 400) {
    const problems =
      typeof json === 'object' &&
      json !== null &&
      'problems' in json &&
      Array.isArray(json.problems)
        ? (json.problems as unknown[])
        : [];
    return { kind: 'problem', problem: profileProblem(problems) };
  }
  if (status === 401) return { kind: 'signed-out' };
  if (status === 503) return { kind: 'unavailable' };
  return { kind: 'failed' };
}
