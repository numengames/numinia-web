/**
 * A zip's fingerprint from the room's side: one worker per zip
 * (zip-hash.worker.ts), how far it got, its answer, and a way to stop it.
 */

import type { HashNews } from './zip-hash.worker';

export interface Hashing {
  /** The zip's SHA-256 (64 lowercase hex); null when it could not be read or was stopped. */
  readonly result: Promise<string | null>;
  readonly stop: () => void;
}

/** Hash `file` in a worker, telling `onProgress` the share done (0 to 1). */
export function hashZip(file: Blob, onProgress: (share: number) => void): Hashing {
  const worker = new Worker(new URL('./zip-hash.worker.ts', import.meta.url), { type: 'module' });
  let settle: (value: string | null) => void = () => undefined;
  const result = new Promise<string | null>((resolve) => {
    settle = resolve;
  });
  const stop = (): void => {
    worker.terminate();
    settle(null);
  };
  worker.onmessage = (event: MessageEvent<HashNews>) => {
    const news = event.data;
    if ('done' in news) {
      onProgress(news.of === 0 ? 1 : news.done / news.of);
      return;
    }
    worker.terminate();
    settle('sha256' in news ? news.sha256 : null);
  };
  worker.onerror = () => stop();
  worker.postMessage(file);
  return { result, stop };
}
