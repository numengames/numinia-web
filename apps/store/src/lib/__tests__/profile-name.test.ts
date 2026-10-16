import { describe, expect, it } from 'vitest';
import {
  AVATAR_ID_MAX as TILL_AVATAR_MAX,
  PROFILE_NAME_MAX as TILL_NAME_MAX,
  PROFILE_PROBLEMS,
  readAvatarId as tillAvatarId,
  readProfileChange as tillChange,
  readProfileName as tillName,
} from '../../../../till/src/lib/profiles';
import { SHEET_RECORD_KEY, citizenToMarkdown, emptyCitizen } from '../citizen-profile';
import {
  PROFILE_AVATAR_PROBLEM,
  PROFILE_CHANGE_PROBLEM,
  PROFILE_NAME_MAX,
  PROFILE_NAME_PROBLEM,
  prefillName,
  profileOutcome,
  profileProblem,
  readAvatarId,
  readProfileChange,
  readProfileName,
} from '../profile-name';

/** Every code point a name may never hold: C0, DEL, C1, the direction overrides and isolates. */
const FORBIDDEN = [
  ...Array.from({ length: 32 }, (_, index) => index),
  0x7f,
  ...Array.from({ length: 32 }, (_, index) => 0x80 + index),
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
];

const NAMES: readonly unknown[] = [
  'Rima',
  '  Rima  ',
  'Ana María Ferrán',
  'Rima\n',
  '\nRima',
  '',
  '   ',
  '\u3000',
  'a'.repeat(60),
  'a'.repeat(61),
  '🙂'.repeat(60),
  '🙂'.repeat(61),
  '\u200b',
  '\u200b\u200c\u2060',
  'R\u200bima',
  '·',
  '7',
  'リマ',
  '리마',
  undefined,
  null,
  1,
  true,
  {},
  ['Rima'],
  ...FORBIDDEN.map((point) => `Ri${String.fromCodePoint(point)}ma`),
];

const AVATARS: readonly unknown[] = [
  null,
  'avatar-arla-mncdhz3l',
  'ndg-019d3e6c-129a-701e-95fc-ce1754d5c917',
  'starter-avatar-01',
  'a'.repeat(64),
  'a'.repeat(65),
  'Avatar-Arla',
  'avatar_arla',
  '-arla',
  '',
  '../thumbs/x',
  'https://example.org/me.png',
  'data:image/png;base64,AAAA',
  undefined,
  1,
  {},
];

const CHANGES: readonly unknown[] = [
  null,
  undefined,
  'Rima',
  [],
  { name: ' Rima ', avatar: null },
  { name: 'Rima', avatar: 'avatar-arla-mncdhz3l' },
  { name: 'Rima' },
  { avatar: null },
  { name: 'Rima', avatar: undefined },
  { name: 'Rima', avatar: null, wallet: `0x${'cd'.repeat(20)}` },
  { name: '', avatar: 'Bad Id' },
  { name: 'Ri\u202ema', avatar: 'avatar-arla-mncdhz3l' },
  { name: 'Rima', avatar: new Date(0) },
];

describe('the rules of a name and an avatar, as the till keeps them', () => {
  it('reads every name exactly as the till does', () => {
    expect(PROFILE_NAME_MAX).toBe(TILL_NAME_MAX);
    for (const name of NAMES) {
      expect(readProfileName(name), JSON.stringify(name)).toBe(tillName(name));
    }
  });

  it('reads every avatar id exactly as the till does', () => {
    expect(TILL_AVATAR_MAX).toBe(64);
    for (const avatar of AVATARS) {
      expect(readAvatarId(avatar), String(avatar)).toBe(tillAvatarId(avatar));
    }
  });

  it('reads every change exactly as the till does, and words it in the till’s own sentences', () => {
    for (const change of CHANGES) {
      expect(readProfileChange(change), JSON.stringify(change)).toEqual(tillChange(change));
    }
    expect(PROFILE_NAME_PROBLEM).toBe(PROFILE_PROBLEMS.name);
    expect(PROFILE_AVATAR_PROBLEM).toBe(PROFILE_PROBLEMS.avatar);
    expect(PROFILE_CHANGE_PROBLEM).toBe(PROFILE_PROBLEMS.change);
  });
});

describe('what the settings section makes of the till’s refusals', () => {
  it('tells a name from an avatar, and anything else is «other»', () => {
    expect(profileProblem([PROFILE_NAME_PROBLEM])).toBe('name');
    expect(profileProblem([PROFILE_AVATAR_PROBLEM])).toBe('avatar');
    expect(profileProblem([PROFILE_NAME_PROBLEM, PROFILE_AVATAR_PROBLEM])).toBe('name');
    expect(profileProblem(['wallet must be a lowercase 0x address', PROFILE_AVATAR_PROBLEM])).toBe(
      'avatar',
    );
    expect(profileProblem([PROFILE_CHANGE_PROBLEM])).toBe('other');
    expect(profileProblem([])).toBe('other');
  });
});

describe('the name the input starts with', () => {
  const record = (name: string): string => citizenToMarkdown({ ...emptyCitizen(), name });

  it('is the published name when there is one', () => {
    const published = { name: 'Rima', avatar: null, face: null };
    expect(prefillName(published, record('Otra'))).toBe('Rima');
  });

  it('is the name of the local citizen profile when nothing is published, else empty', () => {
    expect(SHEET_RECORD_KEY).toBe('numinia-lap-personaje');
    expect(prefillName(null, record('  Rima Ferrán '))).toBe('Rima Ferrán');
    expect(prefillName(null, record(''))).toBe('');
    expect(prefillName(null, '')).toBe('');
    expect(prefillName(null, null)).toBe('');
    expect(prefillName(null, '## Notes\n\nnothing else')).toBe('');
  });
});

describe('what an answer of /api/profile means to the section', () => {
  const profile = { name: 'Rima', avatar: 'avatar-arla-mncdhz3l', face: '/thumbs/1x/a.webp' };

  it('reads a profile, or none', () => {
    expect(profileOutcome(200, { ok: true, profile })).toEqual({ kind: 'profile', profile });
    expect(profileOutcome(200, { ok: true, profile: null })).toEqual({
      kind: 'profile',
      profile: null,
    });
  });

  it('reads the till’s refusals as the problem to say', () => {
    expect(profileOutcome(400, { error: 'refused', problems: [PROFILE_NAME_PROBLEM] })).toEqual({
      kind: 'problem',
      problem: 'name',
    });
    expect(profileOutcome(400, { error: 'refused', problems: [PROFILE_AVATAR_PROBLEM] })).toEqual({
      kind: 'problem',
      problem: 'avatar',
    });
    expect(profileOutcome(400, { error: 'body: { name, avatar } or { remove: true }' })).toEqual({
      kind: 'problem',
      problem: 'other',
    });
    expect(profileOutcome(400, { error: 'refused', problems: [1] })).toEqual({
      kind: 'problem',
      problem: 'other',
    });
    expect(profileOutcome(400, null)).toEqual({ kind: 'problem', problem: 'other' });
  });

  it('tells a session that is gone, a till not there yet, and a failure apart', () => {
    expect(profileOutcome(401, { error: 'signed-out' })).toEqual({ kind: 'signed-out' });
    expect(profileOutcome(503, { error: 'not-bound' })).toEqual({ kind: 'unavailable' });
    expect(profileOutcome(502, { error: 'till-failed' })).toEqual({ kind: 'failed' });
    expect(profileOutcome(500, null)).toEqual({ kind: 'failed' });
    expect(profileOutcome(0, null)).toEqual({ kind: 'failed' });
    // A 200 that is not a profile is a failure, never an empty profile.
    expect(profileOutcome(200, { ok: true })).toEqual({ kind: 'failed' });
    expect(profileOutcome(200, { ok: true, profile: { name: 1 } })).toEqual({ kind: 'failed' });
    expect(profileOutcome(200, null)).toEqual({ kind: 'failed' });
  });
});
