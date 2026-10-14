/**
 * The Bazaar's download queue — the goods set aside, and «Download all»,
 * which leaves as ONE .zip built in the visitor's browser (v0.83.0; the
 * Finder fired one download per file, and browsers block the second).
 *
 * Each file is fetched in turn — chain hosts through the same-origin media
 * proxy, since the bucket sends no CORS headers — and stored as it came
 * (zip-write.ts); a README.txt goes with them, naming each file's licence
 * and page. A file that does not answer is named, never silently dropped.
 */

import { useState } from 'react';
import type { BazaarMessages } from '../../i18n/messages';
import type { BazaarItem } from '../../lib/bazaar';
import {
  ZIP_README,
  fetchUrlFor,
  fill,
  zipEntryNames,
  zipFileName,
  zipReadme,
} from '../../lib/bazaar-view';
import { zipStore, type ZipInput } from '../../lib/zip-write';
import { Glyph, KIND_GLYPH } from './glyphs';

type ZipState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'busy'; readonly n: number; readonly total: number }
  | { readonly kind: 'done' }
  | { readonly kind: 'partial'; readonly names: readonly string[] }
  | { readonly kind: 'failed' };

interface BazaarQueueProps {
  items: readonly BazaarItem[];
  locale: string;
  labels: BazaarMessages;
  onRemove: (id: string) => void;
}

async function bytesOf(url: string): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const response = await fetch(fetchUrlFor(url));
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

function save(blob: Blob, name: string): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Some browsers read the address after the click returns: let it live a minute.
  window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
}

function statusText(state: ZipState, labels: BazaarMessages): string {
  switch (state.kind) {
    case 'busy':
      return fill(labels.zipBusy, { n: state.n, total: state.total });
    case 'done':
      return labels.zipDone;
    case 'partial':
      return fill(labels.zipPartial, { names: state.names.join(', ') });
    case 'failed':
      return labels.zipFailed;
    default:
      return '';
  }
}

export function BazaarQueue({ items, locale, labels, onRemove }: BazaarQueueProps) {
  const [state, setState] = useState<ZipState>({ kind: 'idle' });
  const busy = state.kind === 'busy';

  async function downloadAll(): Promise<void> {
    const names = zipEntryNames(items);
    const entries: ZipInput[] = [];
    const listed: { name: string; item: BazaarItem }[] = [];
    const missing: string[] = [];
    for (const [index, item] of items.entries()) {
      setState({ kind: 'busy', n: index + 1, total: items.length });
      const data = item.url === null ? null : await bytesOf(item.url);
      const name = names[index] ?? item.id;
      if (data === null) {
        missing.push(item.name);
      } else {
        entries.push({ name, data });
        listed.push({ name, item });
      }
    }
    if (entries.length === 0) {
      setState({ kind: 'failed' });
      return;
    }
    const note = zipReadme(labels.zipReadme, window.location.origin, locale, listed);
    entries.push({ name: ZIP_README, data: new TextEncoder().encode(note) });
    try {
      save(new Blob(zipStore(entries), { type: 'application/zip' }), zipFileName(new Date()));
    } catch {
      // Past what a plain zip holds (4 GiB): one by one from their pages.
      setState({ kind: 'failed' });
      return;
    }
    setState(missing.length === 0 ? { kind: 'done' } : { kind: 'partial', names: missing });
  }

  return (
    <section
      className="cola tarjeta"
      id="bazaar-queue"
      aria-labelledby="bazaar-queue-title"
      data-bazaar-queue
    >
      <h2 id="bazaar-queue-title">
        {labels.queueLabel}
        <span className="mono" data-bazaar-queue-count>
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="vacia">{labels.queueEmpty}</p>
      ) : (
        <>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <Glyph name={KIND_GLYPH[item.category]} size={16} />
                <span className="nombre">{item.name}</span>
                <span className="mono">{item.format.toUpperCase()}</span>
                <button
                  type="button"
                  className="quitar"
                  aria-label={`${labels.removeFromQueue}: ${item.name}`}
                  data-metric="bazaar-queue-remove"
                  disabled={busy}
                  onClick={() => {
                    setState({ kind: 'idle' });
                    onRemove(item.id);
                  }}
                >
                  <Glyph name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-fantasma ancho"
            data-metric="bazaar-zip"
            disabled={busy}
            onClick={() => {
              void downloadAll();
            }}
          >
            <Glyph name="downloadSimple" size={16} />
            {labels.downloadAll}
          </button>
        </>
      )}
      <p className="estado" role="status" data-bazaar-zip-status={state.kind}>
        {statusText(state, labels)}
      </p>
    </section>
  );
}
