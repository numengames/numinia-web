/**
 * The Bazaar (v0.83.0) — the Finder rethought, the ONE way to navigate the
 * city's digital goods: the filters on the left (the kinds and their
 * collections, the formats, the licence in sight), the goods as cards in the
 * middle, the chosen one and the download queue on the right. On a narrow
 * screen the filters ride above the cards, the queue below them, and the
 * preview opens as a sheet (a modal dialog: focus held, Escape closes).
 *
 * Everything arrives serialized from the build; nothing is fetched until
 * someone asks for a file. Client-safe: bazaar-view.ts, never bazaar.ts.
 */

import type { AssetFormat } from '@numinia/domain';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BazaarMessages } from '../../i18n/messages';
import type { ViewerMessages } from '../../i18n/viewer';
import type { BazaarItem } from '../../lib/bazaar';
import {
  NO_FILTER,
  categoryFacets,
  countLabel,
  formatFacets,
  matches,
  sortItems,
  toggleFormat,
  toggleQueued,
  type BazaarFilter,
  type BazaarSort,
} from '../../lib/bazaar-view';
import type { AssetCategory } from '../../lib/data';
import { BazaarFilters } from './BazaarFilters';
import { BazaarGrid } from './BazaarGrid';
import { BazaarPreview } from './BazaarPreview';
import { BazaarQueue } from './BazaarQueue';
import { Glyph } from './glyphs';

interface BazaarProps {
  items: readonly BazaarItem[];
  labels: BazaarMessages;
  /** The 3D viewer's words, in the page's language. */
  viewerLabels: ViewerMessages;
  locale: string;
}

/** Where the preview fits beside the cards (the page's CSS breaks at the same width). */
const WIDE = '(min-width: 74rem)';

/** Wide until the browser says otherwise: the build renders the wide page. */
function useWide(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const update = (): void => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}

export function Bazaar({ items, labels, viewerLabels, locale }: BazaarProps) {
  const [filter, setFilter] = useState<BazaarFilter>(NO_FILTER);
  const [sort, setSort] = useState<BazaarSort>('recent');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [queue, setQueue] = useState<readonly string[]>([]);
  // Hydration beacon: a click before the handlers attach falls into the
  // void, so the e2e suite waits for data-hydrated.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const wide = useWide();
  const sheet = useRef<HTMLDialogElement>(null);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const facets = useMemo(() => categoryFacets(items), [items]);
  const formats = useMemo(() => formatFacets(items), [items]);
  const allCc0 = useMemo(() => items.every((item) => item.license === 'CC0'), [items]);
  const visible = useMemo(
    () =>
      sortItems(
        items.filter((item) => matches(item, filter, labels.kinds[item.category])),
        sort,
        locale,
      ),
    [items, filter, sort, locale, labels],
  );

  const selected = selectedId === null ? null : (byId.get(selectedId) ?? null);
  const queued = queue
    .map((id) => byId.get(id))
    .filter((item): item is BazaarItem => item !== undefined);

  // The sheet follows the choice on a narrow screen.
  useEffect(() => {
    const dialog = sheet.current;
    if (dialog === null) return;
    if (selected !== null && !dialog.open) dialog.showModal();
    if (selected === null && dialog.open) dialog.close();
  }, [selected, wide]);

  // On a wide screen the preview's pane opening narrows the cards: the
  // chosen card is brought back into sight after the reflow.
  useEffect(() => {
    if (!wide || selectedId === null) return;
    const card = document.querySelector(
      `[data-bazaar-grid] [data-item="${CSS.escape(selectedId)}"]`,
    );
    card?.scrollIntoView({ block: 'nearest' });
  }, [wide, selectedId]);

  const toggleQueue = (id: string): void => setQueue((current) => toggleQueued(current, id));
  const preview = (
    <BazaarPreview
      item={selected}
      queued={selected !== null && queue.includes(selected.id)}
      locale={locale}
      labels={labels}
      viewerLabels={viewerLabels}
      onToggleQueue={toggleQueue}
      onClose={() => setSelectedId(null)}
    />
  );
  const filtered =
    filter.category !== null ||
    filter.collection !== null ||
    filter.formats.length > 0 ||
    filter.query !== '';

  return (
    // data-open: a chosen good takes the third pane; with none chosen the
    // cards keep that width (three columns at 1280 beside the sidebar).
    <div
      className="bazaar"
      data-bazaar
      data-open={wide && selected !== null ? '' : undefined}
      data-hydrated={hydrated ? '' : undefined}
    >
      <BazaarFilters
        facets={facets}
        formats={formats}
        total={items.length}
        filter={filter}
        labels={labels}
        onKind={(category: AssetCategory | null, collection: string | null) =>
          setFilter((current) => ({ ...current, category, collection }))
        }
        onFormat={(format: AssetFormat) =>
          setFilter((current) => ({ ...current, formats: toggleFormat(current.formats, format) }))
        }
      />
      <div className="centro">
        <div className="barra">
          <label className="busca">
            <Glyph name="magnifyingGlass" />
            <input
              type="search"
              value={filter.query}
              placeholder={labels.searchPlaceholder}
              aria-label={labels.searchLabel}
              data-metric="bazaar-search"
              onChange={(event) => {
                const query = event.currentTarget.value;
                setFilter((current) => ({ ...current, query }));
              }}
            />
          </label>
          <p className="cuantos" aria-live="polite" data-bazaar-count>
            {countLabel(visible.length, labels.countOne, labels.countOther)}
            {allCc0 && ` · ${labels.allCc0}`}
          </p>
          <label className="orden">
            <span>{labels.sortLabel}</span>
            <select
              value={sort}
              data-metric="bazaar-sort"
              onChange={(event) =>
                setSort(event.currentTarget.value === 'name' ? 'name' : 'recent')
              }
            >
              <option value="recent">{labels.sortRecent}</option>
              <option value="name">{labels.sortName}</option>
            </select>
          </label>
        </div>
        {visible.length > 0 ? (
          <BazaarGrid
            items={visible}
            selectedId={selectedId}
            queue={queue}
            labels={labels}
            onSelect={setSelectedId}
          />
        ) : (
          <p className="vacio" data-bazaar-empty>
            {labels.noResults}{' '}
            {filtered && (
              <button
                type="button"
                className="btn btn-silencioso"
                data-metric="bazaar-clear"
                onClick={() => setFilter(NO_FILTER)}
              >
                {labels.clearFilters}
              </button>
            )}
          </p>
        )}
      </div>
      <div className="lado">
        {wide && selected !== null && (
          <section className="previa tarjeta" aria-label={labels.previewLabel} data-bazaar-preview>
            {preview}
          </section>
        )}
        <BazaarQueue
          items={queued}
          locale={locale}
          labels={labels}
          onRemove={(id) => setQueue((current) => toggleQueued(current, id))}
        />
      </div>
      {!wide && (
        <dialog
          ref={sheet}
          className="hoja"
          aria-label={labels.previewLabel}
          data-bazaar-preview
          onClose={() => setSelectedId(null)}
        >
          {selected !== null && preview}
        </dialog>
      )}
    </div>
  );
}
