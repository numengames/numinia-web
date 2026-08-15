/**
 * Finder queue bar — the batch download list. "Download all" walks the queue
 * sequentially with hidden anchors; no fetch buffering, the browser streams.
 */

import type { FinderItem } from '../../lib/finder';
import type { FinderMessages } from '../../i18n/messages';

interface DownloadQueueProps {
  items: readonly FinderItem[];
  labels: FinderMessages;
  onRemove: (id: string) => void;
}

function triggerDownload(url: string, name: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener noreferrer';
  anchor.target = '_blank';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export function DownloadQueue({ items, labels, onRemove }: DownloadQueueProps) {
  const downloadable = items.filter((item) => item.url !== null);
  return (
    <section aria-label={labels.queueLabel} data-finder-queue>
      <h3>
        {labels.queueLabel} <span data-finder-queue-count>{items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p>{labels.queueEmpty}</p>
      ) : (
        <>
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <button
                  type="button"
                  aria-label={`${labels.removeFromQueue}: ${item.name}`}
                  data-metric="finder-queue-remove"
                  onClick={() => onRemove(item.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={downloadable.length === 0}
            data-metric="finder-download-all"
            onClick={() => {
              for (const item of downloadable) {
                triggerDownload(item.url as string, item.name);
              }
            }}
          >
            {labels.downloadAll}
          </button>
        </>
      )}
    </section>
  );
}
