/**
 * The Oracle's asset table (MISSION-011). Everything it shows comes from the
 * gated endpoint: without an Oracle session the island renders the refusal,
 * not the data. §13.11 table: amber etiqueta header, 40px rows, Mono for
 * everything measured, sortable columns with aria-sort.
 *
 * v0.89.0 — the room edits: «Añadir» (the one primary) opens GitHub's upload
 * page in the chosen kind's folder, and each row's «Editar» / «Eliminar»
 * opens its kind's catalog in GitHub's own editor, which asks and makes the
 * commit or the pull request. Keyless: the site writes nothing. Every
 * address comes from lib/asset-edit.ts (one encoding helper). While the
 * table loads, a still skeleton of it holds the place.
 */

import { useEffect, useMemo, useState } from 'react';
import type { AdminAssetsMessages } from '../../../i18n/admin-assets';
import {
  addAssetHref,
  CONTENT_DIRS,
  editAssetHref,
  isEditableCategory,
} from '../../../lib/asset-edit';
import type { AssetCategory } from '../../../lib/data';
import { LunaEspera } from '../../chrome/LunaEspera';

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
}

interface AdminAssetsProps {
  labels: AdminLabels;
  edit: AdminAssetsMessages;
  /** Each kind's name, in the page's language (the Bazaar's words). */
  kinds: Readonly<Record<AssetCategory, string>>;
}

type SortKey = 'name' | 'format' | 'createdAt';

/** The kinds «Añadir» offers: every kind the repo keeps a folder for. */
const KINDS = Object.keys(CONTENT_DIRS) as AssetCategory[];

/** Rows of the still skeleton shown while the table loads. */
const SKELETON_ROWS = [0, 1, 2, 3, 4, 5];

function fill(template: string, name: string, id: string): string {
  return template.replace('{name}', name).replace('{id}', id);
}

interface GithubLinkProps {
  href: string;
  className: string;
  title?: string;
  metric: string;
  /** Read after the words: the link opens GitHub in a new tab. */
  opens: string;
  children: string;
}

/** A link to GitHub: a new tab, and a screen reader is told so. */
function GithubLink({ href, className, title, metric, opens, children }: GithubLinkProps) {
  return (
    <a
      className={className}
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      data-metric={metric}
    >
      {children}
      <span className="visually-hidden"> {opens}</span>
      <span aria-hidden="true" className="fuera">
        ↗
      </span>
    </a>
  );
}

export function AdminAssets({ labels, edit, kinds }: AdminAssetsProps) {
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

  if (state === 'loading')
    return (
      <div data-admin-assets data-state="loading" role="status" aria-busy="true">
        <p className="estado">
          <LunaEspera /> {labels.loading}
        </p>
        <div className="tabla-envoltura esqueleto" aria-hidden="true">
          {SKELETON_ROWS.map((row) => (
            <div className="fila-esqueleto" key={row}>
              <span className="barra larga" />
              <span className="barra corta" />
              <span className="barra media" />
              <span className="barra corta" />
            </div>
          ))}
        </div>
      </div>
    );
  if (state === 'forbidden') {
    return (
      <div data-admin-assets data-state="forbidden">
        <div className="tarjeta refuso" role="note">
          <p>
            <strong>{labels.forbidden}</strong>
          </p>
          <p>{labels.forbiddenNote}</p>
        </div>
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
    <div data-admin-assets data-state="ready">
      <div className="editar">
        <details className="anadir" data-admin-add>
          <summary className="btn btn-primario" data-metric="admin-asset-add">
            {edit.add}
          </summary>
          <div className="anadir-menu tarjeta">
            <p>{edit.addHint}</p>
            <ul>
              {KINDS.map((kind) => (
                <li key={kind}>
                  <GithubLink
                    href={addAssetHref(kind)}
                    className="btn btn-fantasma"
                    metric="admin-asset-add-kind"
                    opens={edit.opensGithub}
                  >
                    {kinds[kind]}
                  </GithubLink>
                </li>
              ))}
            </ul>
          </div>
        </details>
        <p className="publica" data-admin-publish-note>
          {edit.publishNote}
        </p>
      </div>
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
              <th scope="col">{edit.actions}</th>
              {header('format', labels.format)}
              <th scope="col">{labels.category}</th>
              <th scope="col">{labels.storage}</th>
              {header('createdAt', labels.created)}
            </tr>
          </thead>
          <tbody>
            {rows.map((asset) => {
              const kind = isEditableCategory(asset.category) ? asset.category : null;
              return (
                <tr key={asset.id}>
                  <td>
                    <span className="nombre">{asset.name}</span>
                    <span className="id mono">{asset.id}</span>
                  </td>
                  <td>
                    {kind !== null && (
                      <span className="acciones">
                        <GithubLink
                          href={editAssetHref(kind)}
                          className="btn btn-silencioso"
                          title={fill(edit.editTitle, asset.name, asset.id)}
                          metric="admin-asset-edit"
                          opens={edit.opensGithub}
                        >
                          {edit.edit}
                        </GithubLink>
                        <GithubLink
                          href={editAssetHref(kind)}
                          className="btn btn-silencioso borrar"
                          title={fill(edit.removeTitle, asset.name, asset.id)}
                          metric="admin-asset-remove"
                          opens={edit.opensGithub}
                        >
                          {edit.remove}
                        </GithubLink>
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="pildora formato">{asset.format.toUpperCase()}</span>
                  </td>
                  <td className="secundario">{kind === null ? asset.category : kinds[kind]}</td>
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
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nota">{edit.rowsHint}</p>
    </div>
  );
}
