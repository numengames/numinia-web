/**
 * The census desk (MISSION-016, ADR-018): look a wallet up in the public
 * census, grant it a rank. Every state is honest — refusal without rank,
 * "not configured" while D23 pends (503), absence as an answer — and every
 * grant the server accepts became an audited commit before this island
 * hears back. Oracle is not offered: the allowlist is its only source.
 */

import { useState } from 'react';

interface RankOption {
  readonly id: string;
  readonly name: string;
}

export interface CensusLabels {
  readonly forbidden: string;
  readonly forbiddenNote: string;
  readonly walletPlaceholder: string;
  readonly lookup: string;
  readonly loading: string;
  readonly notFound: string;
  readonly unconfigured: string;
  readonly invalidWallet: string;
  readonly currentRank: string;
  readonly since: string;
  readonly updatedBy: string;
  readonly grant: string;
  readonly granted: string;
  readonly failed: string;
}

interface CensusRecord {
  readonly wallet: string;
  readonly rank: string;
  readonly since: string;
  readonly updatedAt: string;
  readonly actor: string;
}

const WALLET = /^0x[0-9a-fA-F]{40}$/;

type Panel =
  | { at: 'idle' }
  | { at: 'loading' }
  | { at: 'forbidden' }
  | { at: 'unconfigured' }
  | { at: 'invalid' }
  | { at: 'ready'; record: CensusRecord | null }
  | { at: 'error' };

export function CensusPanel({ labels, ranks }: { labels: CensusLabels; ranks: RankOption[] }) {
  const [wallet, setWallet] = useState('');
  const [panel, setPanel] = useState<Panel>({ at: 'idle' });
  const [rank, setRank] = useState(ranks[0]?.id ?? 'citizen');
  const [note, setNote] = useState('');

  const lookup = async (): Promise<void> => {
    setNote('');
    if (!WALLET.test(wallet.trim())) {
      setPanel({ at: 'invalid' });
      return;
    }
    setPanel({ at: 'loading' });
    try {
      const response = await fetch(`/api/admin/census?wallet=${encodeURIComponent(wallet.trim())}`);
      if (response.status === 403) return setPanel({ at: 'forbidden' });
      if (response.status === 503) return setPanel({ at: 'unconfigured' });
      if (!response.ok) return setPanel({ at: 'error' });
      const data = (await response.json()) as { record: CensusRecord | null };
      setPanel({ at: 'ready', record: data.record });
    } catch {
      setPanel({ at: 'error' });
    }
  };

  const grant = async (): Promise<void> => {
    setNote('');
    try {
      const response = await fetch('/api/admin/census', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim().toLowerCase(), rank }),
      });
      if (response.status === 403) return setPanel({ at: 'forbidden' });
      if (response.status === 503) return setPanel({ at: 'unconfigured' });
      if (!response.ok) return setNote(labels.failed);
      const data = (await response.json()) as { record: CensusRecord };
      setPanel({ at: 'ready', record: data.record });
      setNote(labels.granted);
    } catch {
      setNote(labels.failed);
    }
  };

  return (
    <div data-census-panel>
      <div className="busqueda">
        <input
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
          placeholder={labels.walletPlaceholder}
          spellCheck={false}
          data-metric="census-wallet"
        />
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => void lookup()}
          data-metric="census-lookup"
        >
          {labels.lookup}
        </button>
      </div>

      {panel.at === 'loading' && <p className="estado">{labels.loading}</p>}
      {panel.at === 'invalid' && <p className="estado aviso">{labels.invalidWallet}</p>}
      {panel.at === 'error' && <p className="estado aviso">{labels.failed}</p>}
      {panel.at === 'unconfigured' && <p className="estado aviso">{labels.unconfigured}</p>}
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
          {panel.record ? (
            <dl>
              <div>
                <dt className="etiqueta">{labels.currentRank}</dt>
                <dd className="mono">{panel.record.rank}</dd>
              </div>
              <div>
                <dt className="etiqueta">{labels.since}</dt>
                <dd className="mono">{panel.record.since.slice(0, 10)}</dd>
              </div>
              <div>
                <dt className="etiqueta">{labels.updatedBy}</dt>
                <dd className="mono">{`${panel.record.actor.slice(0, 6)}…${panel.record.actor.slice(-4)}`}</dd>
              </div>
            </dl>
          ) : (
            <p className="estado">{labels.notFound}</p>
          )}
          <div className="conceder">
            <select
              value={rank}
              onChange={(event) => setRank(event.target.value)}
              aria-label={labels.grant}
              data-metric="census-rank"
            >
              {ranks.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => void grant()}
              data-metric="census-grant"
            >
              {labels.grant}
            </button>
          </div>
          {note && (
            <p className="estado" role="status">
              {note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
