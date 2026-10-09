/**
 * The worlds room: asks the session-gated endpoint and shows only what it
 * answers. Without the Oracle rank it shows the refusal, never a world.
 */

import { useEffect, useState } from 'react';
import { LunaEspera } from '../../chrome/LunaEspera';

export interface WorldsLabels {
  readonly forbidden: string;
  readonly forbiddenNote: string;
  readonly loading: string;
  readonly signedAs: string;
  readonly empty: string;
  readonly failed: string;
}

type Panel =
  | { at: 'loading' }
  | { at: 'forbidden' }
  | { at: 'ready'; rank: string; worlds: readonly unknown[] }
  | { at: 'error' };

export function WorldsPanel({ labels }: { labels: WorldsLabels }) {
  const [panel, setPanel] = useState<Panel>({ at: 'loading' });

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/worlds')
      .then(async (response) => {
        if (!alive) return;
        if (response.status === 403) return setPanel({ at: 'forbidden' });
        if (!response.ok) return setPanel({ at: 'error' });
        const data = (await response.json()) as { rank: string; worlds: readonly unknown[] };
        setPanel({ at: 'ready', rank: data.rank, worlds: data.worlds });
      })
      .catch(() => {
        if (alive) setPanel({ at: 'error' });
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div data-worlds-panel>
      {panel.at === 'loading' && (
        <p className="estado">
          <LunaEspera /> {labels.loading}
        </p>
      )}
      {panel.at === 'error' && <p className="estado aviso">{labels.failed}</p>}
      {panel.at === 'forbidden' && (
        <div className="tarjeta refuso" role="note">
          <p>
            <strong>{labels.forbidden}</strong>
          </p>
          <p>{labels.forbiddenNote}</p>
        </div>
      )}
      {panel.at === 'ready' && (
        <div className="tarjeta ficha">
          <dl>
            <div>
              <dt className="etiqueta">{labels.signedAs}</dt>
              <dd className="mono">{panel.rank}</dd>
            </div>
          </dl>
          {panel.worlds.length === 0 && <p className="estado">{labels.empty}</p>}
        </div>
      )}
    </div>
  );
}
