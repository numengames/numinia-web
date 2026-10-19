/**
 * The seal on an AI's token between numinia.com and `/vuelta` (story W6).
 *
 * `/authorize` makes a fresh P-256 key pair for each request: the public
 * half stays in KV with the request, the private half goes ONLY to the
 * browser that started it, in the request's own cookie. When numinia.com
 * hands the token over (the service binding, `HandOffDesk.keep`), the relay
 * seals it at once to that public key — ECDH with a one-time key, HKDF,
 * AES-GCM with the request id as associated data — and keeps only the
 * sealed blob. So the token is never in the browser (it holds a key, not
 * the blob), never readable in KV (it holds the blob, not the key), and
 * only the browser that started the request, coming back to `/vuelta`, can
 * open it. Opened once, the token goes into the grant's props, which the
 * OAuth library encrypts in turn.
 */

const CURVE = { name: 'ECDH', namedCurve: 'P-256' } as const;
const INFO = new TextEncoder().encode('numinia-mcp vuelta v1');

/** Bytes as base64url without padding. */
export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url (padded or not) as bytes; throws on anything else. */
export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** SHA-256 of a text, base64url: how the relay keeps a request's cookie. */
export async function sha256(text: string): Promise<string> {
  return toBase64Url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** One request's key pair: the public half for KV, the private half for the cookie. */
export interface SealKeys {
  /** The raw public point, base64url. */
  readonly publicKey: string;
  /** PKCS #8, base64url. */
  readonly privateKey: string;
}

export async function newSealKeys(): Promise<SealKeys> {
  const pair = (await crypto.subtle.generateKey(CURVE, true, ['deriveBits'])) as CryptoKeyPair;
  const publicKey = (await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer;
  const privateKey = (await crypto.subtle.exportKey('pkcs8', pair.privateKey)) as ArrayBuffer;
  return { publicKey: toBase64Url(publicKey), privateKey: toBase64Url(privateKey) };
}

/** A sealed text: the one-time public key, the nonce and the ciphertext, base64url. */
export interface Sealed {
  readonly epk: string;
  readonly iv: string;
  readonly data: string;
}

async function aesKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  // The Web Crypto field is `public`; workers-types spells it `$public` (a
  // reserved word in its generator), so the literal is cast to its type.
  const ecdh = { name: 'ECDH', public: publicKey } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const shared = await crypto.subtle.deriveBits(ecdh, privateKey, 256);
  const material = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: INFO },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Seal `text` to a request's public key, bound to `context` (the request id). */
export async function seal(recipient: string, text: string, context: string): Promise<Sealed> {
  const theirs = await crypto.subtle.importKey('raw', fromBase64Url(recipient), CURVE, false, []);
  const once = (await crypto.subtle.generateKey(CURVE, true, ['deriveBits'])) as CryptoKeyPair;
  const epk = new Uint8Array((await crypto.subtle.exportKey('raw', once.publicKey)) as ArrayBuffer);
  const key = await aesKey(once.privateKey, theirs, epk);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(context) },
    key,
    new TextEncoder().encode(text),
  );
  return { epk: toBase64Url(epk), iv: toBase64Url(iv), data: toBase64Url(data) };
}

/** Open a sealed text with the cookie's private key, or null when anything does not fit. */
export async function open(
  privateKey: string,
  sealed: Sealed,
  context: string,
): Promise<string | null> {
  try {
    const mine = await crypto.subtle.importKey('pkcs8', fromBase64Url(privateKey), CURVE, false, [
      'deriveBits',
    ]);
    const epk = fromBase64Url(sealed.epk);
    const theirs = await crypto.subtle.importKey('raw', epk, CURVE, false, []);
    const key = await aesKey(mine, theirs, epk);
    const text = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: fromBase64Url(sealed.iv),
        additionalData: new TextEncoder().encode(context),
      },
      key,
      fromBase64Url(sealed.data),
    );
    return new TextDecoder().decode(text);
  } catch {
    return null;
  }
}
