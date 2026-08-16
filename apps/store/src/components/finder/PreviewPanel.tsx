/**
 * Finder pane 3 — format-aware preview. The 3D viewer is lazy-imported so
 * three.js never enters the base finder chunk (bundle budget).
 */

import { lazy, Suspense } from 'react';
import { viewerProxyUrl } from '../../lib/media-proxy';
import type { FinderItem } from '../../lib/finder';
import type { FinderMessages } from '../../i18n/messages';

const ModelViewer = lazy(() =>
  import('../viewer/ModelViewer').then((module) => ({ default: module.ModelViewer })),
);

interface PreviewPanelProps {
  item: FinderItem | null;
  labels: FinderMessages;
}

function PreviewMedia({ item, labels }: { item: FinderItem; labels: FinderMessages }) {
  switch (item.format) {
    case 'glb':
    case 'vrm':
      return (
        <Suspense fallback={<p>…</p>}>
          <ModelViewer url={viewerProxyUrl(item.url)} kind={item.format} />
        </Suspense>
      );
    case 'png':
    case 'jpg':
      return item.url ? (
        <img src={item.url} alt={item.name} />
      ) : (
        <p>{labels.downloadUnavailable}</p>
      );
    case 'mp3':
      return item.url ? <audio controls src={item.url} /> : <p>{labels.downloadUnavailable}</p>;
    case 'mp4':
      return item.url ? <video controls src={item.url} /> : <p>{labels.downloadUnavailable}</p>;
    default:
      // hyp and any future formats: no inline preview, download only.
      return <p>{item.format.toUpperCase()}</p>;
  }
}

export function PreviewPanel({ item, labels }: PreviewPanelProps) {
  return (
    <section aria-label={labels.previewLabel} data-finder-preview>
      {item === null ? (
        <p data-finder-preview-empty>{labels.emptyPreview}</p>
      ) : (
        <>
          <h3>{item.name}</h3>
          <PreviewMedia item={item} labels={labels} />
          {item.url ? (
            <a
              href={item.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              data-metric="finder-download"
            >
              {labels.download}
            </a>
          ) : (
            <p data-download-unavailable>{labels.downloadUnavailable}</p>
          )}
        </>
      )}
    </section>
  );
}
