/**
 * «Entrar» (cut 5): POST /api/mundos/<id>/pass. The till is a fake desk; the
 * key pair is freshly generated; the pass in the answer is verified with the
 * verifier the engine copies.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { AccountDesk, Asker } from '../accounts';
import { answerPass, guestUrl, passUrl, type PassContext } from '../world-pass-answer';
import { b64urlEncode, verifyPass } from '../world-pass';

const ORG = 'acc_team_reset';
const MEMBER: Asker = { wallet: `0x${'AB'.repeat(20)}`, house: false };
const HOUSE: Asker = { wallet: `0x${'99'.repeat(20)}`, house: true };
const NOW = 1_800_000_000;
const SECRET = 's'.repeat(40);

let privateKey = '';
let publicKey = '';

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
  privateKey = btoa(String.fromCharCode(...pkcs8));
  publicKey = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
});

const context = (extra: Partial<PassContext> = {}): PassContext => ({
  worldId: 'bosque',
  hosts: new Map([['bosque', 'bosque.numen.games']]),
  origin: 'https://numinia.com',
  requestOrigin: 'https://numinia.com',
  privateKey,
  secret: SECRET,
  now: NOW,
  ...extra,
});

const answering = (value: unknown) => vi.fn(async () => value);

function fakeDesk(overrides: Partial<Record<keyof AccountDesk, unknown>> = {}): AccountDesk {
  return {
    homeOf: answering({
      ok: true,
      home: { accountId: ORG, accountName: 'Reset', placedAt: 'x' },
      manage: true,
    }),
    access: answering({
      ok: true,
      accountId: ORG,
      as: 'member',
      permissions: ['enter-worlds', 'mute-members'],
      holders: {},
    }),
    roles: answering({
      ok: true,
      accountId: ORG,
      as: 'member',
      roles: [{ id: 'r1', name: 'Builders', color: '#aabbcc', position: 2 }],
      members: [{ wallet: MEMBER.wallet.toLowerCase(), roleIds: ['r1'], name: 'Ana' }],
    }),
    ...overrides,
  } as unknown as AccountDesk;
}

const quiet = vi.fn();
const json = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe('the addresses', () => {
  it('puts the pass after # and none for a guest', () => {
    expect(guestUrl('a.b')).toBe('https://a.b/');
    expect(passUrl('a.b', 't.o.k')).toBe('https://a.b/#pass=t.o.k');
  });
});

describe('POST /api/mundos/<id>/pass', () => {
  it('signs a pass a member’s world verifies, from what the till says', async () => {
    const desk = fakeDesk();
    const out = await answerPass(desk, MEMBER, context(), quiet);
    expect(out.status).toBe(200);
    expect(out.headers.get('cache-control')).toBe('private, no-store');
    const body = await json(out);
    expect(body['pass']).toBe(true);
    const url = new URL(body['url'] as string);
    expect(url.origin).toBe('https://bosque.numen.games');
    const token = url.hash.replace('#pass=', '');
    const verdict = await verifyPass(token, publicKey, { aud: 'bosque', now: NOW });
    expect(verdict.ok).toBe(true);
    expect(verdict.ok && verdict.payload).toMatchObject({
      aud: 'bosque',
      org: ORG,
      perm: ['enter-worlds', 'mute-members'],
      height: 2,
      roles: [{ name: 'Builders', color: '#aabbcc' }],
      name: 'Ana',
    });
    expect(desk.homeOf).toHaveBeenCalledWith('bosque', MEMBER.wallet.toLowerCase(), false);
    expect(desk.access).toHaveBeenCalledWith(MEMBER.wallet.toLowerCase(), ORG, false);
    expect(desk.roles).toHaveBeenCalledWith(MEMBER.wallet.toLowerCase(), ORG, false);
  });

  it('asks as the house when the session is the house’s', async () => {
    const desk = fakeDesk();
    await answerPass(desk, HOUSE, context(), quiet);
    expect(desk.access).toHaveBeenCalledWith(HOUSE.wallet, ORG, true);
  });

  it('sends a guest to the world with no pass: signed out, no till, unplaced, not of the organization, or refused', async () => {
    const guest = { url: 'https://bosque.numen.games/', pass: false };
    const desk = fakeDesk();
    expect(await json(await answerPass(desk, null, context(), quiet))).toEqual(guest);
    expect(await json(await answerPass(null, MEMBER, context(), quiet))).toEqual(guest);
    expect(desk.homeOf).not.toHaveBeenCalled();
    const unplaced = fakeDesk({ homeOf: answering({ ok: true, home: null, manage: false }) });
    expect(await json(await answerPass(unplaced, MEMBER, context(), quiet))).toEqual(guest);
    const stranger = fakeDesk({
      homeOf: answering({ ok: true, home: { accountId: ORG }, manage: false }),
    });
    expect(await json(await answerPass(stranger, MEMBER, context(), quiet))).toEqual(guest);
    expect(stranger.access).not.toHaveBeenCalled();
    const refused = fakeDesk({ homeOf: answering({ ok: false, problems: ['x'] }) });
    expect(await json(await answerPass(refused, MEMBER, context(), quiet))).toEqual(guest);
    const noAccess = fakeDesk({ access: answering({ ok: false, problems: ['x'] }) });
    expect(await json(await answerPass(noAccess, MEMBER, context(), quiet))).toEqual(guest);
    const noRoles = fakeDesk({ roles: answering({ ok: false, problems: ['x'] }) });
    expect(await json(await answerPass(noRoles, MEMBER, context(), quiet))).toEqual(guest);
  });

  it('answers 502 when the till fails or answers oddly', async () => {
    const broken = fakeDesk({ homeOf: vi.fn().mockRejectedValue(new Error('boom')) });
    expect((await answerPass(broken, MEMBER, context(), quiet)).status).toBe(502);
    const odd = fakeDesk({ access: answering({ ok: true }) });
    expect((await answerPass(odd, MEMBER, context(), quiet)).status).toBe(502);
    const oddRoles = fakeDesk({ roles: answering({ ok: true }) });
    expect((await answerPass(oddRoles, MEMBER, context(), quiet)).status).toBe(502);
  });

  it('answers 503 and logs when signing throws something that is not a pass error', async () => {
    const out = await answerPass(
      fakeDesk(),
      MEMBER,
      context({ now: 10n as unknown as number }),
      quiet,
    );
    expect(out.status).toBe(503);
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ rule: 'threw' }));
  });

  it('answers 404 for a world with no host or an id out of shape, and 403 for another origin', async () => {
    const desk = fakeDesk();
    expect((await answerPass(desk, MEMBER, context({ worldId: 'nope' }), quiet)).status).toBe(404);
    expect((await answerPass(desk, MEMBER, context({ worldId: 'No Way' }), quiet)).status).toBe(
      404,
    );
    const evil = await answerPass(
      desk,
      MEMBER,
      context({ requestOrigin: 'https://evil.example' }),
      quiet,
    );
    expect(evil.status).toBe(403);
    expect(desk.homeOf).not.toHaveBeenCalled();
    const noHeader = await answerPass(desk, MEMBER, context({ requestOrigin: null }), quiet);
    expect(noHeader.status).toBe(200);
  });

  it('fails closed with 503 and the guest link when a key is missing or wrong', async () => {
    for (const extra of [
      { privateKey: undefined },
      { privateKey: 'not a key' },
      { secret: undefined },
      { secret: '' },
    ]) {
      const out = await answerPass(fakeDesk(), MEMBER, context(extra), quiet);
      expect(out.status, JSON.stringify(extra)).toBe(503);
      expect(await json(out)).toEqual({ error: 'no-pass', url: 'https://bosque.numen.games/' });
    }
    expect(quiet).toHaveBeenCalledWith(expect.objectContaining({ kind: 'world-pass' }));
  });
});
