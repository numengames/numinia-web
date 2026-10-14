/**
 * The Bazaar's middle pane — the goods as cards (v0.89.0, «las fichas hay que
 * darles una vuelta»): the picture first and large (4:3; a PNG or JPG is its
 * own picture, a model without one shows its kind's glyph), then the name,
 * one quiet line with its kind and format, and the licence as a small chip.
 * A tap chooses the good; its preview shows beside (or, on a phone, as a
 * sheet) with the download, the queue and its page. Pure presentation: the
 * choice lives in the root.
 */

import { useId } from 'react';
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

interface BazaarCardProps {
  item: BazaarItem;
  selected: boolean;
  queued: boolean;
  labels: BazaarMessages;
  onSelect: (id: string) => void;
}

function BazaarCard({ item, selected, queued, labels, onSelect }: BazaarCardProps) {
  // The card is named by its words (name, kind, licence), not twice by the
  // picture's alt: one id per card for aria-labelledby.
  const id = useId();
  const format = item.format.toUpperCase();
  const cc0 = item.license === 'CC0';
  return (
    <button
      type="button"
      className="bazaar-card"
      aria-pressed={selected}
      aria-labelledby={`${id}-n ${id}-t ${id}-l`}
      data-metric="bazaar-card"
      data-item={item.id}
      onClick={() => onSelect(item.id)}
    >
      <span className="stage">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            srcSet={item.thumbnailSrcSet ?? undefined}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width={480}
            height={360}
          />
        ) : (
          <span className="sin-foto">
            <Glyph name={KIND_GLYPH[item.category]} size={36} />
            {format}
          </span>
        )}
        {queued && (
          <span className="en-cola">
            <Glyph name="check" size={12} />
            {labels.inQueue}
          </span>
        )}
      </span>
      <span className="cuerpo">
        <span className="nombre" id={`${id}-n`}>
          {item.name}
        </span>
        <span className="pie">
          <span className="tipo" id={`${id}-t`}>
            {labels.kinds[item.category]} · {format}
          </span>
          <span
            className={cc0 ? 'chip vivo' : 'chip'}
            id={`${id}-l`}
            title={cc0 ? labels.cardLicence : undefined}
          >
            {item.license}
          </span>
        </span>
      </span>
    </button>
  );
}

export function BazaarGrid({ items, selectedId, queue, labels, onSelect }: BazaarGridProps) {
  return (
    <ul className="bazaar-grid" aria-label={labels.gridLabel} data-bazaar-grid>
      {items.map((item) => (
        <li key={item.id}>
          <BazaarCard
            item={item}
            selected={item.id === selectedId}
            queued={queue.includes(item.id)}
            labels={labels}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
