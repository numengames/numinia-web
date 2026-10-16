/**
 * «IAs de organización» (2026-10-17): the rules numinia.com shares with the
 * till about an organization's AIs, and the shape of the signed request an AI
 * (through its bridge) makes to get its world pass. Pure: no desk, no clock.
 *
 * The till is the one place that decides what an agent may do (ORG-011, via
 * @numinia/domain); this file only reads text the way the till does so the
 * fixture desk and the routes refuse the same things in the same words, and
 * a test pins the sentences against the till's own.
 *
 * ── The request (POST /api/agents/pass, lib/agent-pass.ts) ──────────────────
 *   body   { org, agent, aud, t, sig }
 *   sig    Ed25519 (base64url, 64 bytes) over the ASCII bytes of
 *          `numinia-agent-pass:<org>:<agent>:<aud>:<t>` with the agent's key
 *   t      seconds since the epoch; |now − t| ≤ 60
 * The key the till keeps for the agent is `ed25519:` + the 32 raw bytes in
 * base64url (43 characters), the engine's rule (tools/agente.ts).
 */

import { b64urlDecode } from './world-pass';

export const AGENT_PROBLEMS = {
  agentId:
    'agentId must be 1 to 32 characters: lower case letters, digits and hyphens, none at either end',
  draft: 'agent must be an object with id, name, publicKey and, if any, roleIds',
  name: 'name must be 1 to 40 characters, none of them a control character',
  publicKey: 'publicKey must be ed25519: and 43 base64url characters (a 32-byte key)',
  roleIds: 'roleIds must be a list of at most 10 role ids',
  change: 'change must be an object with enabled (true or false) and/or state (activa or dormida)',
  enabled: 'enabled must be true or false',
  state: 'state must be activa or dormida',
  audience: 'aud must be a world id',
  moment: 't must be a whole number of seconds',
  noSuchAgent: 'the organization has no such agent',
  taken: 'the organization already has an agent with that id or that key',
  limit: 'an organization keeps at most 20 agents',
  houseCannot: 'the house does not answer for an agent: a member creates it',
  replayed: 'that request was already used',
} as const;

/** The closed list of states; a new one is added here, in the till and in its migration's CHECK. */
export const AGENT_STATES = ['activa', 'dormida'] as const;

/** How far apart the agent's clock and ours may be, in seconds. */
export const PASS_WINDOW_SECONDS = 60;

/** The signature of a request is Ed25519's: 64 bytes. */
const SIGNATURE_BYTES = 64;

const AGENT_ID = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
const WORLD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const KEY = /^ed25519:[A-Za-z0-9_-]{43}$/;

// eslint-disable-next-line no-control-regex -- a name never holds a control character
const CONTROL = /[\u0000-\u001f\u007f]/;

/** An agent's name as the till reads it: trimmed, 1 to 40 characters, none of them a control character. */
export function readAgentName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  const length = [...name].length;
  return length >= 1 && length <= 40 && !CONTROL.test(name) ? name : undefined;
}

export const isAgentId = (value: unknown): value is string =>
  typeof value === 'string' && AGENT_ID.test(value);

export const isAccountId = (value: unknown): value is string =>
  typeof value === 'string' && ACCOUNT_ID.test(value);

export const isAudience = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 64 && WORLD_ID.test(value);

/** The 32 raw bytes of an agent's public key, or null when the text is not a canonical key. */
export function publicKeyBytes(value: unknown): Uint8Array<ArrayBuffer> | null {
  if (typeof value !== 'string' || !KEY.test(value)) return null;
  const bytes = b64urlDecode(value.slice(8)) as Uint8Array<ArrayBuffer>;
  // 43 characters hold 258 bits: the last character's spare bits must be zero.
  const again = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return again === value.slice(8) ? bytes : null;
}

/** The exact ASCII line an agent signs to ask for a pass. */
export const passMessage = (org: string, agent: string, aud: string, t: number): string =>
  `numinia-agent-pass:${org}:${agent}:${aud}:${t}`;

/**
 * Whether `signature` (base64url) is the agent's signature of the request,
 * checked against the public key the till keeps for it. False for anything
 * that is not a 64-byte signature or a key.
 */
export async function verifyRequest(
  publicKey: string,
  signature: string,
  org: string,
  agent: string,
  aud: string,
  t: number,
): Promise<boolean> {
  const raw = publicKeyBytes(publicKey);
  const sig = b64urlDecode(signature);
  if (raw === null || sig === null || sig.length !== SIGNATURE_BYTES) return false;
  const key = await crypto.subtle.importKey('raw', raw, 'Ed25519', false, ['verify']);
  return crypto.subtle.verify(
    'Ed25519',
    key,
    sig,
    new TextEncoder().encode(passMessage(org, agent, aud, t)),
  );
}

/** Whether `t` is within the window of `now` (both in seconds). */
export const inWindow = (t: number, now: number): boolean =>
  Math.abs(now - t) <= PASS_WINDOW_SECONDS;
