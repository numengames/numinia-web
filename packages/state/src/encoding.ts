/**
 * Standard base64 (RFC 4648, with padding) — the GitHub contents API dialect.
 * Hand-rolled so the package stays WinterCG-pure (no Buffer, no atob/btoa
 * assumptions), mirroring @numinia/auth's base64url helpers.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    // i < length inside the loop, so bytes[i] is always present.
    const a = bytes[i] as number;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : ALPHABET[c & 63];
  }
  return out;
}

/** Whitespace is skipped (the API wraps content in newlines); padding ends
    the stream; anything else fails closed with null. */
export function fromBase64(text: string): Uint8Array | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of text) {
    if (char === '\n' || char === '\r' || char === ' ' || char === '\t') continue;
    if (char === '=') break;
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
