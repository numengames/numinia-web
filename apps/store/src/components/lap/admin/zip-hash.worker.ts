/**
 * A zip's fingerprint, made off the page's thread: SHA-256 (@noble/hashes)
 * over 8 MiB slices of the file (lib/zip-read.ts `digestChunks`), saying how
 * far it got. `crypto.subtle.digest` cannot stream: it would hold the whole
 * zip, up to 2 GiB, in memory. The room starts it right after its own
 * reading of the zip passes, and the Oracle signs only once it has answered.
 */

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { digestChunks } from '../../../lib/zip-read';

/** What the worker says: how far it got, the fingerprint, or that the file could not be read. */
export type HashNews =
  | { readonly done: number; readonly of: number }
  | { readonly sha256: string }
  | { readonly failed: true };

/** The worker's own side of the conversation (its global scope), as much of it as is used. */
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Blob>) => void) | null;
  postMessage: (news: HashNews) => void;
};

scope.onmessage = (event) => {
  const file = event.data;
  const hash = sha256.create();
  digestChunks(
    file,
    (bytes) => hash.update(bytes),
    (done) => scope.postMessage({ done, of: file.size }),
  )
    .then(() => scope.postMessage({ sha256: bytesToHex(hash.digest()) }))
    .catch(() => scope.postMessage({ failed: true }));
};
