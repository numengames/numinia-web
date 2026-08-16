/**
 * Finder island root (MISSION-003 P2) — three panes + download queue.
 * All data arrives serialized from the build; no fetching at runtime.
 */

import { useEffect, useMemo, useState } from 'react';
import type { FinderCategory, FinderItem } from '../../lib/finder';
import type { FinderMessages } from '../../i18n/messages';
import { toggleQueued } from '../../lib/finder-state';
import { CollectionTree, collectionKey } from './CollectionTree';
import { FileList } from './FileList';
import { PreviewPanel } from './PreviewPanel';
import { DownloadQueue } from './DownloadQueue';

interface FinderProps {
  tree: readonly FinderCategory[];
  labels: FinderMessages;
}

export function Finder({ tree, labels }: FinderProps) {
  const first = tree[0];
  const initialKey = first ? collectionKey(first.id, first.collections[0]?.id ?? '') : '';
  const [selectedCollection, setSelectedCollection] = useState(initialKey);
  // Hydration beacon (see Inspector): interactions before the handlers
  // attach would fall into the void; consumers wait for data-hydrated.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queue, setQueue] = useState<readonly string[]>([]);

  const itemsById = useMemo(() => {
    const map = new Map<string, FinderItem>();
    for (const category of tree) {
      for (const collection of category.collections) {
        for (const item of collection.items) map.set(item.id, item);
      }
    }
    return map;
  }, [tree]);

  const currentItems = useMemo(() => {
    for (const category of tree) {
      for (const collection of category.collections) {
        if (collectionKey(category.id, collection.id) === selectedCollection) {
          return collection.items;
        }
      }
    }
    return [];
  }, [tree, selectedCollection]);

  const selectedItem = selectedId === null ? null : (itemsById.get(selectedId) ?? null);
  const queuedItems = queue
    .map((id) => itemsById.get(id))
    .filter((item): item is FinderItem => item !== undefined);

  return (
    <div data-finder data-hydrated={hydrated ? '' : undefined}>
      <div className="panes">
        <CollectionTree
          tree={tree}
          selected={selectedCollection}
          labels={labels}
          onSelect={(key) => {
            setSelectedCollection(key);
            setSelectedId(null);
          }}
        />
        <FileList
          items={currentItems}
          selectedId={selectedId}
          queued={queue}
          labels={labels}
          onSelect={setSelectedId}
          onToggleQueue={(id) => setQueue((current) => toggleQueued(current, id))}
        />
        <PreviewPanel item={selectedItem} labels={labels} />
      </div>
      <DownloadQueue
        items={queuedItems}
        labels={labels}
        onRemove={(id) => setQueue((current) => toggleQueued(current, id))}
      />
    </div>
  );
}
