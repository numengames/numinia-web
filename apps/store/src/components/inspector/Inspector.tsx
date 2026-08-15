/**
 * Inspector island root (MISSION-003 P5) — drop or pick a local GLB/VRM,
 * see it render plus its metadata. Fully client-side: nothing is uploaded.
 */

import { lazy, Suspense, useCallback, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  detectKind,
  formatBytes,
  statsRows,
  type InspectorKind,
  type ModelStats,
} from '../../lib/inspector';

const InspectorStage = lazy(() =>
  import('./InspectorStage').then((module) => ({ default: module.InspectorStage })),
);

export interface InspectorLabels {
  readonly dropHint: string;
  readonly pickFile: string;
  readonly unsupported: string;
  readonly loadError: string;
  readonly statsTitle: string;
  readonly fileLabel: string;
  readonly sizeLabel: string;
  readonly statLabels: Readonly<Record<keyof ModelStats, string>>;
}

interface LoadedFile {
  readonly name: string;
  readonly size: number;
  readonly url: string;
  readonly kind: InspectorKind;
}

type InspectorState =
  | { status: 'empty' }
  | { status: 'unsupported'; name: string }
  | { status: 'loading'; file: LoadedFile }
  | { status: 'ready'; file: LoadedFile; stats: ModelStats }
  | { status: 'error'; file: LoadedFile };

export function Inspector({ labels }: { labels: InspectorLabels }) {
  const [state, setState] = useState<InspectorState>({ status: 'empty' });

  const accept = useCallback((file: File) => {
    const kind = detectKind(file.name);
    if (!kind) {
      setState({ status: 'unsupported', name: file.name });
      return;
    }
    const url = URL.createObjectURL(file);
    setState({ status: 'loading', file: { name: file.name, size: file.size, url, kind } });
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) accept(file);
    },
    [accept],
  );

  const onPick = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) accept(file);
    },
    [accept],
  );

  const file = 'file' in state ? state.file : null;

  return (
    <div data-inspector data-inspector-status={state.status}>
      <label
        className="dropzone"
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        data-metric="inspector-pick"
      >
        <span>{labels.dropHint}</span>
        <input type="file" accept=".glb,.gltf,.vrm" onChange={onPick} />
        <span className="pick">{labels.pickFile}</span>
      </label>

      {state.status === 'unsupported' && (
        <p role="alert" data-inspector-unsupported>
          {labels.unsupported} ({state.name})
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" data-inspector-error>
          {labels.loadError}
        </p>
      )}

      {file && state.status !== 'unsupported' && state.status !== 'error' && (
        <div className="result">
          <Suspense fallback={<p>…</p>}>
            <InspectorStage
              url={file.url}
              kind={file.kind}
              onStats={(stats) => setState({ status: 'ready', file, stats })}
              onError={() => setState({ status: 'error', file })}
            />
          </Suspense>
          <section aria-label={labels.statsTitle} data-inspector-stats>
            <h3>{labels.statsTitle}</h3>
            <dl>
              <div className="row">
                <dt>{labels.fileLabel}</dt>
                <dd>{file.name}</dd>
              </div>
              <div className="row">
                <dt>{labels.sizeLabel}</dt>
                <dd>{formatBytes(file.size)}</dd>
              </div>
              {state.status === 'ready' &&
                statsRows(state.stats, labels.statLabels).map((row) => (
                  <div key={row.label} className="row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
