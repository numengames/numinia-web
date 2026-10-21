/**
 * S18: the `ia` block on an AI's world pass — built from what the till says, covered by the signature, and checked by the
 * verifier the engine copies: only an AI's pass may carry it, and only the block the engine accepts.
 */

import { agentPassIa, DEFAULT_AGENT_PRESENCE } from '@numinia/domain';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  b64urlEncode,
  buildAgentPassPayload,
  buildPassPayload,
  signPass,
  verifyPass,
  type PassPayload,
} from '../world-pass';

const SECRET = 'a'.repeat(40);
const NOW = 1_800_000_000;
const ORG = 'acc_team_reset';
const WALLET = `0x${'ab'.repeat(20)}`;
const at = { aud: 'bosque', now: NOW };

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

const ia = agentPassIa(DEFAULT_AGENT_PRESENCE, { comunidad: 'Reset', nombre: 'Ana' });
const agent = {
  aud: 'bosque',
  org: ORG,
  secret: SECRET,
  agent: 'ag_1',
  name: 'Hermes',
  state: 'activa',
  access: { permissions: ['enter-worlds'], height: 1 },
  roles: [],
  now: NOW,
} as const;
const sign = (payload: object) => signPass(privateKey, payload as PassPayload);

describe('buildAgentPassPayload and the ia block', () => {
  it('carries the block as given, and nothing else changes', async () => {
    const without = await buildAgentPassPayload(agent);
    const withIt = await buildAgentPassPayload({ ...agent, ia });
    expect(withIt.ia).toEqual(ia);
    const { ia: _ia, ...rest } = withIt;
    expect(rest).toEqual(without);
    expect('ia' in without).toBe(false);
  });
});

describe('verifyPass and ia', () => {
  it('accepts an AI’s pass with the block and hands it back, asleep or awake', async () => {
    for (const state of ['activa', 'dormida'] as const) {
      const payload = await buildAgentPassPayload({ ...agent, state, ia });
      expect(await verifyPass(await sign(payload), publicKey, at)).toEqual({ ok: true, payload });
    }
  });

  it('refuses a block the engine would not accept', async () => {
    const base = await buildAgentPassPayload(agent);
    const bad = [
      {},
      { responde: { comunidad: '' } },
      { ...ia, responde: { comunidad: 'x', cartera: '0xABC' } },
      { ...ia, extra: true },
      'ia',
      null,
    ];
    for (const block of bad) {
      const verdict = await verifyPass(await sign({ ...base, ia: block }), publicKey, at);
      expect(verdict, JSON.stringify(block)).toEqual({ ok: false, why: 'payload' });
    }
  });

  it('refuses it on a person’s pass', async () => {
    const person = await buildPassPayload({
      aud: 'bosque',
      org: ORG,
      secret: SECRET,
      wallet: WALLET,
      access: { as: 'member', permissions: ['enter-worlds'], holders: {} },
      roles: { ok: true, accountId: ORG, as: 'member', roles: [], members: [] },
      now: NOW,
    });
    expect(await verifyPass(await sign({ ...person, ia }), publicKey, at)).toEqual({
      ok: false,
      why: 'payload',
    });
  });
});
