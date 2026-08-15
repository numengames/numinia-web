/**
 * Minimal ambient declarations for WinterCG-common globals used here
 * (Web Crypto, TextEncoder/Decoder) — keeps DOM and Node libs out of this
 * runtime-agnostic package.
 */

declare const crypto: {
  getRandomValues(array: Uint8Array): Uint8Array;
  readonly subtle: {
    importKey(
      format: 'raw',
      keyData: Uint8Array,
      algorithm: { name: 'HMAC'; hash: 'SHA-256' },
      extractable: boolean,
      keyUsages: readonly ['sign'],
    ): Promise<unknown>;
    sign(algorithm: 'HMAC', key: unknown, data: Uint8Array): Promise<ArrayBuffer>;
  };
};

declare class TextEncoder {
  encode(input: string): Uint8Array;
}

declare class TextDecoder {
  decode(input: Uint8Array): string;
}
