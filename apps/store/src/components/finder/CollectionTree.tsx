/**
 * Finder pane 1 — category → collection navigation. Pure presentation:
 * selection state lives in the Finder root.
 */

import type { FinderCategory } from '../../lib/finder';
import type { FinderMessages } from '../../i18n/messages';

interface CollectionTreeProps {
  tree: readonly FinderCategory[];
  selected: string;
  labels: FinderMessages;
  onSelect: (collectionKey: string) => void;
}

/** Collection keys are namespaced to survive same-named collections. */
export function collectionKey(categoryId: string, collectionId: string): string {
  return `${categoryId}/${collectionId}`;
}

export function CollectionTree({ tree, selected, labels, onSelect }: CollectionTreeProps) {
  return (
    <nav aria-label={labels.collectionsLabel} data-finder-tree>
      {tree.map((category) => (
        <div key={category.id}>
          <h3>{labels.categories[category.id] ?? category.id}</h3>
          <ul>
            {category.collections.map((collection) => {
              const key = collectionKey(category.id, collection.id);
              return (
                <li key={key}>
                  <button
                    type="button"
                    aria-pressed={key === selected}
                    data-metric="finder-collection"
                    data-collection={key}
                    onClick={() => onSelect(key)}
                  >
                    {collection.id}
                    <span className="count">{collection.items.length}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
