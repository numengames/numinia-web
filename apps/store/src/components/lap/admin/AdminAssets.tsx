/**
 * The Oracle's asset table (MISSION-011). Everything it shows comes from the
 * gated endpoint: without an Oracle session the island renders the refusal,
 * not the data. §13.11 table: amber etiqueta header, 40px rows, Mono for
 * everything measured, sortable columns with aria-sort.
 */

import { useEffect, useMemo, useState } from 'react';

interface AdminAsset {
  readonly id: string;
  readonly name: string;
  readonly format: string;
  readonly category: string;
  readonly license: string;
  readonly createdAt: string;
  readonly layers: Readonly<Record<'r2' | 'github' | 'ipfs' | 'arweave', boolean>>;
}

interface AdminLabels {
  readonly forbidden: string;
  readonly forbiddenNote: string;
  readonly loading: string;
  readonly search: string;
  readonly all: string;
  readonly name: string;
  readonly format: string;
  readonly category: string;
  readonly storage: string;
  readonly created: string;
  readonly count: string;
  readonly readOnly: string;
}

type SortKey = 'name' | 'format' | 'createdAt';

export function AdminAssets({ labels }: { labels: AdminLabels }) {
  const [state, setState] = useState<'loading' | 'forbidden' | 'ready'>('loading');
  const [assets, setAssets] = useState<readonly AdminAsset[]>([]);
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'name', asc: true });

  useEffect(() => {
    void fetch('/api/admin/overview')
      .then(async (response) => {
        if (!response.ok) {
          setState('forbidden');
          return;
        }
        const data = (await response.json()) as { assets: AdminAsset[] };
        setAssets(data.assets);
        setState('ready');
      })
      .catch(() => setState('forbidden'));
  }, []);

  const formats = useMemo(() => [...new Set(assets.map((asset) => asset.format))].sort(), [assets]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = assets.filter(
      (asset) =>
        (!needle || asset.name.toLowerCase().includes(needle) || asset.id.includes(needle)) &&
        (!format || asset.format === format),
    );
    const direction = sort.asc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sort.key === 'createdAt' ? a.createdAt : a[sort.key];
      const right = sort.key === 'createdAt' ? b.createdAt : b[sort.key];
      return left.localeCompare(right) * direction;
    });
  }, [assets, query, format, sort]);

  if (state === 'loading') return <p className="estado">{labels.loading}</p>;
  if (state === 'forbidden') {
    return (
      <div className="tarjeta refuso" role="note">
        <p>
          <strong>{labels.forbidden}</strong>
        </p>
        <p>{labels.forbiddenNote}</p>
      </div>
    );
  }

  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() =>
          setSort((current) => ({ key, asc: current.key === key ? !current.asc : true }))
        }
        data-metric="admin-sort"
      >
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.asc ? ' ↑' : ' ↓') : ''}</span>
      </button>
    </th>
  );

  return (
    <div data-admin-assets>
      <div className="controles">
        <label>
          <span className="visually-hidden">{labels.search}</span>
          <input
            type="search"
            placeholder={labels.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            data-metric="admin-search"
          />
        </label>
        <div className="filtros">
          <button
            type="button"
            aria-pressed={format === ''}
            onClick={() => setFormat('')}
            data-metric="admin-filter"
          >
            {labels.all} ({assets.length})
          </button>
          {formats.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={format === option}
              onClick={() => setFormat(option)}
              data-metric="admin-filter"
            >
              {option.toUpperCase()} ({assets.filter((asset) => asset.format === option).length})
            </button>
          ))}
        </div>
        <p className="cuenta mono">
          {rows.length} {labels.count}
        </p>
      </div>
      <div className="tabla-envoltura">
        <table>
          <thead>
            <tr>
              {header('name', labels.name)}
              {header('format', labels.format)}
              <th scope="col">{labels.category}</th>
              <th scope="col">{labels.storage}</th>
              {header('createdAt', labels.created)}
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => (
              <tr key={asset.id}>
                <td>
                  <span className="nombre">{asset.name}</span>
                  <span className="id mono">{asset.id}</span>
                </td>
                <td>
                  <span className="pildora formato">{asset.format.toUpperCase()}</span>
                </td>
                <td className="secundario">{asset.category}</td>
                <td>
                  <span className="capas mono">
                    {(['r2', 'github', 'ipfs', 'arweave'] as const).map((layer) => (
                      <span key={layer} data-on={asset.layers[layer] ? 'yes' : 'no'}>
                        {layer.toUpperCase()}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="mono secundario">{asset.createdAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nota">{labels.readOnly}</p>
    </div>
  );
}
