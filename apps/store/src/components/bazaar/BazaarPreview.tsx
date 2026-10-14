/**
 * The Bazaar's preview — the chosen good, large: its picture (its sound, its
 * video; a model turns in 3D only when asked, the viewer lazy so three.js
 * never rides in the Bazaar's own chunk), its facts — only the ones the
 * catalogue has, never an invented weight — and what to do with it:
 * download it, queue it for the zip, open its page.
 *
 * The root decides where it shows: beside the grid on a wide screen, as a
 * sheet (a modal dialog) on a narrow one.
 */

import { lazy, Suspense, useState } from 'react';
import type { BazaarMessages } from '../../i18n/messages';
import type { BazaarItem } from '../../lib/bazaar';
import { fill, objectHref } from '../../lib/bazaar-view';
import { Glyph, KIND_GLYPH } from './glyphs';

const ModelViewer = lazy(() =>
  import('../viewer/ModelViewer').then((module) => ({ default: module.ModelViewer })),
);

interface BazaarPreviewProps {
  item: BazaarItem | null;
  queued: boolean;
  locale: string;
  labels: BazaarMessages;
  onToggleQueue: (id: string) => void;
  onClose: () => void;
}

function Stage({ item, labels }: { item: BazaarItem; labels: BazaarMessages }) {
  const [in3d, setIn3d] = useState(false);
  const model = item.format === 'glb' || item.format === 'vrm' ? item.format : null;
  if (model !== null && in3d) {
    return (
      <div className="escenario visor">
        <Suspense fallback={<p className="cargando">…</p>}>
          <ModelViewer url={item.url} kind={model} />
        </Suspense>
      </div>
    );
  }
  if (item.format === 'mp4' && item.url) {
    return (
      <div className="escenario">
        <video controls preload="metadata" src={item.url} poster={item.thumbnailUrl ?? undefined} />
      </div>
    );
  }
  const picture =
    item.format === 'png' || item.format === 'jpg'
      ? (item.thumbnailUrl ?? item.url)
      : item.thumbnailUrl;
  return (
    <>
      <div className="escenario">
        {picture ? (
          <img src={picture} alt="" decoding="async" />
        ) : (
          <span className="sin-foto">
            <Glyph name={KIND_GLYPH[item.category]} size={48} />
            {item.format.toUpperCase()}
          </span>
        )}
        {model !== null && item.url && (
          <button
            type="button"
            className="btn btn-fantasma ver-3d"
            data-metric="bazaar-view-3d"
            onClick={() => setIn3d(true)}
          >
            <Glyph name="cube" size={16} />
            {labels.viewIn3d}
          </button>
        )}
      </div>
      {item.format === 'mp3' && item.url && <audio controls preload="none" src={item.url} />}
    </>
  );
}

export function BazaarPreview({
  item,
  queued,
  locale,
  labels,
  onToggleQueue,
  onClose,
}: BazaarPreviewProps) {
  if (item === null) {
    return (
      <p className="vacio" data-bazaar-preview-empty>
        {labels.emptyPreview}
      </p>
    );
  }
  const format = item.format.toUpperCase();
  return (
    <div className="previa-cuerpo" data-item={item.id}>
      <div className="previa-cabeza">
        <span className="chips">
          <span className="chip">
            {labels.kinds[item.category]} · {format}
          </span>
          {item.license === 'CC0' && <span className="chip vivo">CC0</span>}
        </span>
        <button
          type="button"
          className="cerrar"
          aria-label={labels.closePreview}
          data-metric="bazaar-preview-close"
          onClick={onClose}
        >
          <Glyph name="x" />
        </button>
      </div>
      {/* Keyed: a new good starts as its picture, never in the last one's 3D. */}
      <Stage key={item.id} item={item} labels={labels} />
      <h2>{item.name}</h2>
      {item.line !== null && <p className="linea">{item.line}</p>}
      <dl className="datos">
        <div>
          <dt>{labels.factFormat}</dt>
          <dd>{format}</dd>
        </div>
        <div>
          <dt>{labels.factLicence}</dt>
          <dd>{item.license}</dd>
        </div>
        <div>
          <dt>{labels.factKind}</dt>
          <dd>{labels.kinds[item.category]}</dd>
        </div>
        <div>
          <dt>{labels.factCollection}</dt>
          <dd>{item.collection}</dd>
        </div>
      </dl>
      <div className="acciones">
        {item.url ? (
          <a
            className="btn btn-primario"
            href={item.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            data-metric="bazaar-download"
          >
            <Glyph name="downloadSimple" size={16} />
            {fill(labels.download, { format })}
          </a>
        ) : (
          <p className="no-disponible" data-download-unavailable>
            {labels.downloadUnavailable}
          </p>
        )}
        <button
          type="button"
          className="btn btn-fantasma"
          aria-pressed={queued}
          data-metric="bazaar-queue-toggle"
          onClick={() => onToggleQueue(item.id)}
        >
          <Glyph name={queued ? 'check' : 'listPlus'} size={16} />
          {queued ? labels.inQueue : labels.addToQueue}
        </button>
        <a
          className="btn btn-fantasma"
          href={objectHref(locale, item.id)}
          data-metric="bazaar-open-card"
        >
          {labels.openCard}
        </a>
      </div>
    </div>
  );
}
