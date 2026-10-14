/**
 * The Bazaar's middle pane — the goods as cards: the picture (or the kind's
 * glyph when there is none), the kind and format, the name and the licence
 * line. A tap chooses the good; its preview shows beside (or, on a phone,
 * as a sheet). Pure presentation: the choice lives in the root.
 */

import type { BazaarMessages } from '../../i18n/messages';
import type { BazaarItem } from '../../lib/bazaar';
import { Glyph, KIND_GLYPH } from './glyphs';

interface BazaarGridProps {
  items: readonly BazaarItem[];
  selectedId: string | null;
  queue: readonly string[];
  labels: BazaarMessages;
  onSelect: (id: string) => void;
}

export function BazaarGrid({ items, selectedId, queue, labels, onSelect }: BazaarGridProps) {
  return (
    <ul className="bazaar-grid" aria-label={labels.gridLabel} data-bazaar-grid>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className="bazaar-card"
            aria-pressed={item.id === selectedId}
            data-metric="bazaar-card"
            data-item={item.id}
            onClick={() => onSelect(item.id)}
          >
            <span className="stage">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={240}
                  height={180}
                />
              ) : (
                <span className="sin-foto">
                  <Glyph name={KIND_GLYPH[item.category]} size={32} />
                  {item.format.toUpperCase()}
                </span>
              )}
              {queue.includes(item.id) && (
                <span className="en-cola">
                  <Glyph name="check" size={12} />
                  {labels.inQueue}
                </span>
              )}
            </span>
            <span className="cuerpo">
              <span className="tipo">
                {labels.kinds[item.category]} · {item.format.toUpperCase()}
              </span>
              <span className="nombre">{item.name}</span>
              <span className="licencia">
                <Glyph name="check" size={14} />
                {item.license === 'CC0' ? labels.cardLicence : item.license}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
