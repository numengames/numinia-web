/**
 * Finder pane 2 — files of the selected collection, with per-file queue toggle.
 */

import type { FinderItem } from '../../lib/finder';
import type { FinderMessages } from '../../i18n/messages';

interface FileListProps {
  items: readonly FinderItem[];
  selectedId: string | null;
  queued: readonly string[];
  labels: FinderMessages;
  onSelect: (id: string) => void;
  onToggleQueue: (id: string) => void;
}

export function FileList({
  items,
  selectedId,
  queued,
  labels,
  onSelect,
  onToggleQueue,
}: FileListProps) {
  return (
    <section aria-label={labels.filesLabel} data-finder-files>
      <ul>
        {items.map((item) => {
          const isQueued = queued.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === selectedId}
                data-metric="finder-file"
                data-file={item.id}
                onClick={() => onSelect(item.id)}
              >
                <span className="name">{item.name}</span>
                <span className="format">{item.format.toUpperCase()}</span>
              </button>
              <button
                type="button"
                className="queue-toggle"
                aria-pressed={isQueued}
                aria-label={`${isQueued ? labels.removeFromQueue : labels.addToQueue}: ${item.name}`}
                data-metric="finder-queue-toggle"
                onClick={() => onToggleQueue(item.id)}
              >
                {isQueued ? '−' : '+'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
