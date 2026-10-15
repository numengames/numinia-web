/**
 * A fresh signature of the wallet for what is dangerous (STD-051, ORG-008):
 * giving «Administrator» or «Manage roles» asks the person's wallet to sign
 * again at that moment, so a session cookie alone cannot hand out the keys
 * of an organization.
 *
 * Stateless, like the login nonce (@numinia/auth nonce.ts), so any isolate
 * can check a proof. The server words the act in a few plain lines and
 * hands them out with a token, `f1.<base64url(claims)>.<HMAC>` under the
 * session secret, whose claims are the session's wallet, the SHA-256 of the
 * act in its canonical form, the lines themselves, the chain the wallet
 * named and an expiry two minutes ahead. The browser has the wallet sign
 * the lines and sends the act again with `{ token, signature }`; the server
 * checks the MAC, the clock, the wallet, the act's hash and, last, that the
 * signature over the lines is the session wallet's.
 *
 * The `f1.` prefix is inside the MAC: a token never passes for a session
 * (`v1.`) or a login nonce (`n1.`). Known gap, written down on purpose: with
 * no store, whoever holds the session AND a proof can send the same act
 * again inside its two minutes — the act the wallet signed, nothing else.
 *
 * Server only: zod is fine here, no island imports this file.
 */

import { z } from 'zod';
import { fromBase64Url, hmacSha256, timingSafeEqualBytes, toBase64Url } from '@numinia/auth';
import { fill } from './accounts';

/** How long the lines may wait for their signature. */
export const FRESH_TTL_MS = 2 * 60 * 1000;

const TOKEN_VERSION = 'f1';

/** What a token carries, under the session secret. */
export interface FreshClaims {
  /** The session's wallet, lowercase: only it may sign. */
  readonly wallet: string;
  /** `actDigest` of the act the lines describe. */
  readonly act: string;
  /** The exact lines the wallet signs. */
  readonly message: string;
  /** The chain the wallet named, for a smart account's signature; null for none. */
  readonly chainId: number | null;
  /** Milliseconds since the epoch. */
  readonly expiresAt: number;
}

/** What the act carries the second time it is sent (`fresh`). */
export interface FreshProof {
  readonly token: string;
  readonly signature: string;
}

export interface SignatureCheck {
  readonly message: string;
  readonly signature: string;
  readonly address: string;
  readonly chainId: number | null;
}

/** Whether `signature` is `address`'s own over `message` (lib/auth/server.ts asks thirdweb). */
type VerifyWalletSignature = (check: SignatureCheck) => Promise<boolean>;

/** What a fresh signature needs from the Worker: the session secret, the check and the clock. */
export interface FreshDeps {
  readonly secret: string;
  readonly verify: VerifyWalletSignature;
  readonly now: () => number;
}

export type FreshVerdict = 'ok' | 'expired' | 'mismatch';

const encoder = new TextEncoder();

/** The act in one canonical text: keys sorted at every depth, lists in their order. */
export function canonicalAct(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalAct).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = value as Readonly<Record<string, unknown>>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalAct(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** SHA-256 of the canonical act, base64url: the same act always hashes the same. */
export async function actDigest(act: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalAct(act)));
  return toBase64Url(new Uint8Array(digest));
}

// Built on first use, never at import (as lib/accounts-source.ts does).
let claimsShape: z.ZodType<FreshClaims> | null = null;
function claimsSchema(): z.ZodType<FreshClaims> {
  claimsShape ??= z
    .object({
      wallet: z.string(),
      act: z.string(),
      message: z.string(),
      chainId: z.number().int().positive().nullable(),
      expiresAt: z.number(),
    })
    .strict();
  return claimsShape;
}

const macOf = (secret: string, body: string): Promise<Uint8Array> =>
  hmacSha256(secret, encoder.encode(`${TOKEN_VERSION}.${body}`));

export async function issueFreshToken(secret: string, claims: FreshClaims): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(claims)));
  return `${TOKEN_VERSION}.${body}.${toBase64Url(await macOf(secret, body))}`;
}

/** The claims of a token signed with `secret`, or null. Fail closed; the clock is the caller's. */
export async function readFreshToken(secret: string, token: string): Promise<FreshClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return null;
  const [, body, mac] = parts as [string, string, string];
  const given = fromBase64Url(mac);
  if (given === null || !timingSafeEqualBytes(given, await macOf(secret, body))) return null;
  const bytes = fromBase64Url(body);
  if (bytes === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  const parsed = claimsSchema().safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** Whether the proof is the session wallet's signature, in time, for this very act. */
export async function checkFresh(
  deps: FreshDeps,
  wallet: string,
  act: unknown,
  proof: FreshProof,
): Promise<FreshVerdict> {
  const claims = await readFreshToken(deps.secret, proof.token);
  if (claims === null) return 'mismatch';
  if (deps.now() > claims.expiresAt) return 'expired';
  if (claims.wallet !== wallet || claims.act !== (await actDigest(act))) return 'mismatch';
  let signed: boolean;
  try {
    signed = await deps.verify({
      message: claims.message,
      signature: proof.signature,
      address: wallet,
      chainId: claims.chainId,
    });
  } catch {
    signed = false;
  }
  return signed ? 'ok' : 'mismatch';
}

// ---- The lines the wallet signs --------------------------------------------

/** The lines' words in one language (i18n/fresh-signature.ts); `{…}` are filled by `fill`. */
export interface FreshWords {
  /** The first line: `{organization}`. */
  readonly heading: string;
  /** A new role: `{role}`, `{permissions}`. */
  readonly create: string;
  /** A role that gains permissions: `{role}`, `{permissions}`. */
  readonly edit: string;
  /** A role given to someone: `{role}`, `{permissions}`, `{who}`. */
  readonly give: string;
  /** The last line: `{time}`, HH:MM in UTC. */
  readonly until: string;
}

export interface FreshAct {
  readonly kind: 'create' | 'edit' | 'give';
  readonly organization: string;
  readonly role: string;
  /** What the act grants that asks for the signature, as labels in the words' language. */
  readonly permissions: readonly string[];
  /** Who receives the role (a short wallet); empty unless `give`. */
  readonly who: string;
}

/** A name typed by people stays on its line: no line break or control character gets through. */
function oneLine(text: string): string {
  return text
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
}

/** Three lines: whose organization, what the act gives, and until when the signature is worth anything. */
export function freshMessage(
  words: FreshWords,
  lang: string,
  expiresAt: number,
  act: FreshAct,
): string {
  const permissions = new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(
    act.permissions,
  );
  return [
    fill(words.heading, { organization: oneLine(act.organization) }),
    fill(words[act.kind], { role: oneLine(act.role), permissions, who: act.who }),
    fill(words.until, { time: new Date(expiresAt).toISOString().slice(11, 16) }),
  ].join('\n');
}
