/**
 * base64url + byte helpers — hand-rolled so the package stays WinterCG-pure
 * (no Buffer, no atob/btoa assumptions).
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    // i < length inside the loop, so bytes[i] is always present.
    const a = bytes[i] as number;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b !== undefined) out += ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c !== undefined) out += ALPHABET[c & 63];
  }
  return out;
}

/** Returns null on any character outside the base64url alphabet (fail closed). */
export function fromBase64Url(text: string): Uint8Array | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** HMAC-SHA256 with Web Crypto — the one MAC every token of the package uses. */
export async function hmacSha256(secret: string, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

/** Constant-time byte comparison — never short-circuits on a mismatch. */
export function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  // Equal lengths checked above, so b[i] is always in bounds.
  a.forEach((byte, i) => {
    diff |= byte ^ (b[i] as number);
  });
  return diff === 0;
}
