/**
 * «IAs de organización»: the rules numinia.com shares with the till about an
 * organization's AIs (lib/agents.ts) — the words pinned against the till's.
 */

import { DEFAULT_AGENT_PRESENCE } from '@numinia/domain';
import { describe, expect, it } from 'vitest';
import {
  AGENT_PROBLEMS as TILL_PROBLEMS,
  AGENT_STATES as TILL_STATES,
  MAX_AGENTS as TILL_MAX,
  readAgentId as tillAgentId,
  readAgentName as tillAgentName,
  presenceDiff as tillPresenceDiff,
  readPublicKey as tillPublicKey,
} from '../../../../till/src/lib/agents';
import {
  AGENT_PROBLEMS,
  AGENT_STATES,
  PASS_WINDOW_SECONDS,
  inWindow,
  isAccountId,
  isAgentId,
  isAudience,
  passMessage,
  presenceDiff,
  publicKeyBytes,
  readAgentName,
  verifyRequest,
} from '../agents';
import { MAX_AGENTS } from '../agents-fixture';
import { b64urlEncode } from '../world-pass';

const keyOf = (n: number): string => `ed25519:${b64urlEncode(new Uint8Array(32).fill(n))}`;

describe("the till's words and limits", () => {
  it('are the very ones of apps/till', () => {
    expect(AGENT_PROBLEMS).toEqual(TILL_PROBLEMS);
    expect([...AGENT_STATES]).toEqual([...TILL_STATES]);
    expect(MAX_AGENTS).toBe(TILL_MAX);
  });

  it('read an id, a name and a key as the till does', () => {
    const keys = [
      keyOf(7),
      keyOf(255),
      `${keyOf(0).slice(0, -1)}B`,
      'ed25519:abc',
      `${keyOf(1)}A`,
      5,
    ];
    for (const key of keys) {
      expect(publicKeyBytes(key) !== null).toBe(tillPublicKey(key) !== undefined);
    }
    for (const id of [
      'a',
      'hermes-1',
      'a'.repeat(32),
      'a'.repeat(33),
      '-a',
      'a-',
      'A',
      'a:b',
      '',
      7,
    ]) {
      expect(isAgentId(id)).toBe(tillAgentId(id) !== undefined);
    }
    for (const name of ['  Hermes ', '', '   ', 'x'.repeat(40), 'x'.repeat(41), 'a\nb', 4]) {
      expect(readAgentName(name)).toBe(tillAgentName(name));
    }
  });
});

describe('reading', () => {
  it('knows an account, an agent and a world', () => {
    expect(isAccountId('acc_t_2e2dd18c880ba974da1512dc7cde2431')).toBe(true);
    for (const value of ['', 'a b', 'a:b', 'x'.repeat(65), 3])
      expect(isAccountId(value)).toBe(false);
    expect(isAudience('agora-plaza')).toBe(true);
    for (const value of ['Agora', 'a'.repeat(65), '', 'a--b', 3])
      expect(isAudience(value)).toBe(false);
  });

  it('turns a key into its 32 bytes, or nothing', () => {
    expect([...(publicKeyBytes(keyOf(9)) as Uint8Array)]).toEqual(Array(32).fill(9));
    expect(publicKeyBytes('ed25519:short')).toBeNull();
    expect(publicKeyBytes(`${keyOf(0).slice(0, -1)}B`)).toBeNull();
    expect(publicKeyBytes(undefined)).toBeNull();
  });

  it('writes the line an agent signs, to the letter', () => {
    expect(passMessage('acc_t', 'hermes-1', 'agora-plaza', 1_800_000_000)).toBe(
      'numinia-agent-pass:acc_t:hermes-1:agora-plaza:1800000000',
    );
  });

  it('keeps the window at sixty seconds either side', () => {
    expect(PASS_WINDOW_SECONDS).toBe(60);
    expect(inWindow(100, 160)).toBe(true);
    expect(inWindow(160, 100)).toBe(true);
    expect(inWindow(100, 161)).toBe(false);
    expect(inWindow(161, 100)).toBe(false);
  });
});

describe('verifying a request', () => {
  it('accepts the agent’s signature of the exact line, and nothing else', async () => {
    const pair = (await crypto.subtle.generateKey('Ed25519', true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const key = `ed25519:${b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)))}`;
    const sig = b64urlEncode(
      new Uint8Array(
        await crypto.subtle.sign(
          'Ed25519',
          pair.privateKey,
          new TextEncoder().encode(passMessage('o', 'a', 'w', 5)),
        ),
      ),
    );
    expect(await verifyRequest(key, sig, 'o', 'a', 'w', 5)).toBe(true);
    expect(await verifyRequest(key, sig, 'o', 'a', 'w', 6)).toBe(false);
    expect(await verifyRequest(key, sig, 'o', 'b', 'w', 5)).toBe(false);
    expect(await verifyRequest(keyOf(1), sig, 'o', 'a', 'w', 5)).toBe(false);
    // Not a key, not base64url, not 64 bytes.
    expect(await verifyRequest('junk', sig, 'o', 'a', 'w', 5)).toBe(false);
    expect(await verifyRequest(key, '***', 'o', 'a', 'w', 5)).toBe(false);
    expect(await verifyRequest(key, 'AAAA', 'o', 'a', 'w', 5)).toBe(false);
  });
});

describe('what changed in an AI’s presence (for the log)', () => {
  const was = DEFAULT_AGENT_PRESENCE;
  const now = {
    cuerpo: { tipo: 'casa', modelo: 2 },
    burbuja: { forma: 'caja', radio: 9, visible: 'siempre' },
    llamada: { nombre: false, barra: false, boton: false, solo_dentro: false, frase: 'ven' },
    oye: 'burbuja',
    quedarse_h: 24,
  } as const;

  it('lists each field that moved, as path=value, and nothing when nothing moved', () => {
    expect(presenceDiff(was, was)).toEqual([]);
    expect(presenceDiff(was, { ...was, burbuja: { ...was.burbuja, radio: 6 } })).toEqual([
      'burbuja.radio=6',
    ]);
    expect(presenceDiff(was, now)).toEqual([
      'cuerpo.modelo=2',
      'burbuja.forma=caja',
      'burbuja.radio=9',
      'burbuja.visible=siempre',
      'llamada.nombre=false',
      'llamada.barra=false',
      'llamada.boton=false',
      'llamada.solo_dentro=false',
      'llamada.frase=ven',
      'oye=burbuja',
      'quedarse_h=24',
    ]);
    // a phrase that went is `frase=`
    const { frase: _gone, ...without } = now.llamada;
    expect(presenceDiff(now, { ...now, llamada: without })).toEqual(['llamada.frase=']);
  });

  it('says it as the till does', () => {
    for (const [before, after] of [
      [was, now],
      [now, was],
      [was, was],
    ] as const) {
      expect(presenceDiff(before, after)).toEqual(tillPresenceDiff(before, after));
    }
  });
});
