/**
 * The Bazaar's left pane — the filters: the kinds of goods (and, when a
 * kind holds two collections or more, each collection), the formats, and
 * the licence in sight. Pure presentation: the filter lives in the root.
 */

import type { AssetFormat } from '@numinia/domain';
import type { BazaarMessages } from '../../i18n/messages';
import type { BazaarFilter, CategoryFacet } from '../../lib/bazaar-view';
import type { AssetCategory } from '../../lib/data';
import { Glyph, KIND_GLYPH } from './glyphs';

interface BazaarFiltersProps {
  facets: readonly CategoryFacet[];
  formats: readonly { readonly format: AssetFormat; readonly count: number }[];
  total: number;
  filter: BazaarFilter;
  labels: BazaarMessages;
  onKind: (category: AssetCategory | null, collection: string | null) => void;
  onFormat: (format: AssetFormat) => void;
}

export function BazaarFilters({
  facets,
  formats,
  total,
  filter,
  labels,
  onKind,
  onFormat,
}: BazaarFiltersProps) {
  return (
    <aside className="bazaar-filters" aria-label={labels.filtersLabel} data-bazaar-filters>
      <div className="grupo">
        <h2 id="bazaar-kinds">{labels.collectionsLabel}</h2>
        <ul className="clases" aria-labelledby="bazaar-kinds">
          <li>
            <button
              type="button"
              className="filtro"
              aria-pressed={filter.category === null}
              data-metric="bazaar-collection"
              data-category=""
              onClick={() => onKind(null, null)}
            >
              <Glyph name="squaresFour" />
              {labels.allLabel}
              <span className="n">{total}</span>
            </button>
          </li>
          {facets.map((facet) => (
            <li key={facet.category}>
              <button
                type="button"
                className="filtro"
                aria-pressed={filter.category === facet.category && filter.collection === null}
                data-metric="bazaar-collection"
                data-category={facet.category}
                onClick={() => onKind(facet.category, null)}
              >
                <Glyph name={KIND_GLYPH[facet.category]} />
                {labels.categories[facet.category]}
                <span className="n">{facet.count}</span>
              </button>
              {facet.collections.length > 1 && (
                <ul className="colecciones">
                  {facet.collections.map((collection) => (
                    <li key={collection.id}>
                      <button
                        type="button"
                        className="filtro sub"
                        aria-pressed={
                          filter.category === facet.category && filter.collection === collection.id
                        }
                        data-metric="bazaar-collection"
                        data-category={facet.category}
                        data-collection={collection.id}
                        onClick={() => onKind(facet.category, collection.id)}
                      >
                        {collection.id}
                        <span className="n">{collection.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="grupo">
        <h2 id="bazaar-formats">{labels.formatsLabel}</h2>
        <div className="formatos" role="group" aria-labelledby="bazaar-formats">
          {formats.map(({ format }) => (
            <button
              key={format}
              type="button"
              className="chip"
              aria-pressed={filter.formats.includes(format)}
              data-metric="bazaar-format"
              data-format={format}
              onClick={() => onFormat(format)}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="grupo licencia">
        <h2>{labels.licenceLabel}</h2>
        <p data-bazaar-licence>{labels.licenceNote}</p>
      </div>
    </aside>
  );
}
