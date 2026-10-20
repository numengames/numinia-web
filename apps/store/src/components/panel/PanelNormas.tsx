/**
 * «Normas de vuestros espacios» (condiciones/w2): the section of the
 * community's Ajustes where the terms of its worlds are read and, by whoever
 * holds `administrator`, written and published.
 *
 * Numinia's own terms stand first, fixed and read-only: they come before the
 * community's and cannot be removed. Below, the points of the version in
 * force; an administrator edits a draft of them (title, text, mandatory or
 * optional, norm or data — a data point is never mandatory), writes the new
 * version number and publishes. The till is the lock and the validator
 * (`validateCommunityTerms` of @numinia/domain) the judge: whatever it
 * refuses comes back as `path: message`, in Spanish, and is shown next to
 * its field. Every other role reads; the history of versions is read-only.
 */

import { useCallback, useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { PanelTermsMessages } from '../../i18n/panel-terms';
import { fill } from '../../lib/accounts';
import { localeHref } from '../../lib/app-nav';
import { LEGAL_DOC_VERSION } from '../../lib/legal';
import {
  blankPoint,
  draftBody,
  draftOf,
  nextVersion,
  problemsOf,
  withType,
  type DraftPoint,
  type PointField,
  type TermsPage,
  type TermsProblems,
  type TermsVersion,
} from '../../lib/panel-terms';
import { loadTerms, publishTerms } from '../../lib/panel-terms-client';
import { LunaEspera } from '../chrome/LunaEspera';
import { PanelGlyph } from './PanelGlyph';

/** The most points a version may hold (the domain's rule). */
const MAX_POINTS = 20;
const NO_PROBLEMS: TermsProblems = { version: [], general: [], points: {} };

type Read = { readonly at: 'loading' } | { readonly at: 'failed' } | { readonly at: 'ready' };
type Saving = 'idle' | 'saving' | 'saved' | 'failed';

function dateOf(iso: string, locale: SupportedLocale): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

function Problems({
  id,
  lines,
}: {
  readonly id: string;
  readonly lines: readonly string[] | undefined;
}) {
  if (lines === undefined || lines.length === 0) return null;
  return (
    <ul className="normas-problemas" id={id} role="alert" data-terms-problem>
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

/** The fixed line: Numinia's terms come first and cannot be removed. */
function NuminiaFixed({
  ui,
  locale,
}: {
  readonly ui: PanelTermsMessages;
  readonly locale: SupportedLocale;
}) {
  return (
    <div className="normas-fijas" data-terms-fixed>
      <p className="etiqueta normas-etiqueta">{ui.fixed.label}</p>
      <p>{ui.fixed.text}</p>
      <a
        href={localeHref(locale, '/legal/terms/')}
        className="normas-enlace"
        data-metric="panel-terms-numinia"
      >
        {fill(ui.fixed.link, { version: LEGAL_DOC_VERSION.terms })}
      </a>
    </div>
  );
}

function ReadOnlyPoints({
  version,
  ui,
}: {
  readonly version: TermsVersion;
  readonly ui: PanelTermsMessages;
}) {
  return (
    <ul className="normas-lista" data-terms-own>
      {version.puntos.map((point) => (
        <li key={point.id} className="normas-punto" data-terms-point={point.id}>
          <span className="normas-punto-cuerpo">
            <b>{point.titulo}</b>
            <span>{point.texto}</span>
          </span>
          <span className="normas-fichas">
            <span className="normas-ficha">
              {point.tipo === 'datos' ? ui.own.data : ui.own.norm}
            </span>
            <span className="normas-ficha" data-mandatory={point.obligatorio ? 'true' : 'false'}>
              {point.obligatorio ? ui.own.mandatory : ui.own.optional}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PointEditor({
  point,
  index,
  ui,
  problems,
  busy,
  onChange,
  onRemove,
}: {
  readonly point: DraftPoint;
  readonly index: number;
  readonly ui: PanelTermsMessages;
  readonly problems: Partial<Record<PointField, readonly string[]>>;
  readonly busy: boolean;
  readonly onChange: (next: DraftPoint) => void;
  readonly onRemove: () => void;
}) {
  const key = `norma-${point.key}`;
  const isData = point.tipo === 'datos';
  const invalid = (field: PointField): boolean => (problems[field]?.length ?? 0) > 0;
  const described = (field: PointField): string | undefined =>
    invalid(field) ? `${key}-${field}-p` : undefined;
  return (
    <li className="normas-editor" data-terms-draft-point={index}>
      <p className="etiqueta normas-etiqueta">{fill(ui.edit.point, { n: index + 1 })}</p>

      <div className="gente-campo">
        <label htmlFor={`${key}-titulo`}>{ui.edit.titleLabel}</label>
        <input
          id={`${key}-titulo`}
          value={point.titulo}
          maxLength={120}
          autoComplete="off"
          disabled={busy}
          aria-invalid={invalid('titulo')}
          aria-describedby={described('titulo')}
          onChange={(event) => onChange({ ...point, titulo: event.target.value })}
        />
        <Problems id={`${key}-titulo-p`} lines={problems.titulo} />
      </div>

      <div className="gente-campo">
        <label htmlFor={`${key}-texto`}>{ui.edit.textLabel}</label>
        <textarea
          id={`${key}-texto`}
          rows={3}
          value={point.texto}
          maxLength={2000}
          disabled={busy}
          aria-invalid={invalid('texto')}
          aria-describedby={described('texto')}
          onChange={(event) => onChange({ ...point, texto: event.target.value })}
        />
        <Problems id={`${key}-texto-p`} lines={problems.texto} />
      </div>

      <div className="normas-opciones">
        <fieldset className="gente-campo saldo-fieldset">
          <legend>{ui.edit.kindLabel}</legend>
          <div className="normas-seg" role="group" aria-label={ui.edit.kindLabel}>
            {(['norma', 'datos'] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                aria-pressed={point.tipo === tipo}
                disabled={busy}
                onClick={() => onChange(withType(point, tipo))}
                data-metric={`panel-terms-type-${tipo}`}
              >
                {tipo === 'datos' ? ui.own.data : ui.own.norm}
              </button>
            ))}
          </div>
          <Problems id={`${key}-tipo-p`} lines={problems.tipo} />
        </fieldset>

        <fieldset className="gente-campo saldo-fieldset">
          <legend>{ui.edit.mandatoryLabel}</legend>
          <div className="normas-seg" role="group" aria-label={ui.edit.mandatoryLabel}>
            <button
              type="button"
              aria-pressed={point.obligatorio}
              disabled={busy || isData}
              aria-describedby={isData ? `${key}-datos-nota` : described('obligatorio')}
              onClick={() => onChange({ ...point, obligatorio: true })}
              data-metric="panel-terms-mandatory"
            >
              {ui.own.mandatory}
            </button>
            <button
              type="button"
              aria-pressed={!point.obligatorio}
              disabled={busy || isData}
              onClick={() => onChange({ ...point, obligatorio: false })}
              data-metric="panel-terms-optional"
            >
              {ui.own.optional}
            </button>
          </div>
          {isData && (
            <p className="saldo-nota" id={`${key}-datos-nota`} data-terms-data-note>
              {ui.edit.dataNote}
            </p>
          )}
          <Problems id={`${key}-obligatorio-p`} lines={problems.obligatorio} />
        </fieldset>
      </div>
      <Problems id={`${key}-id-p`} lines={problems.id} />

      <div>
        <button
          type="button"
          className="btn btn-silencioso"
          disabled={busy}
          onClick={onRemove}
          data-metric="panel-terms-remove"
        >
          <PanelGlyph name="trash" size={16} /> {ui.edit.remove}
        </button>
      </div>
    </li>
  );
}

function Editor({
  org,
  page,
  ui,
  onPublished,
}: {
  readonly org: string;
  readonly page: TermsPage;
  readonly ui: PanelTermsMessages;
  readonly onPublished: (page: TermsPage) => void;
}) {
  const [points, setPoints] = useState<readonly DraftPoint[]>(() => draftOf(page.current));
  const [nextKey, setNextKey] = useState(() => (page.current?.puntos.length ?? 0) + 1);
  const [version, setVersion] = useState(() => nextVersion(page.history));
  const [problems, setProblems] = useState<TermsProblems>(NO_PROBLEMS);
  const [saving, setSaving] = useState<Saving>('idle');
  const [published, setPublished] = useState('');
  const busy = saving === 'saving';

  const change = (key: number, next: DraftPoint): void =>
    setPoints((all) => all.map((point) => (point.key === key ? next : point)));
  const remove = (key: number): void =>
    setPoints((all) => all.filter((point) => point.key !== key));
  const add = (): void => {
    setPoints((all) => [...all, blankPoint(nextKey)]);
    setNextKey(nextKey + 1);
  };
  const discard = (): void => {
    setPoints(draftOf(page.current, nextKey));
    setNextKey(nextKey + (page.current?.puntos.length ?? 0));
    setProblems(NO_PROBLEMS);
    setSaving('idle');
  };

  const publish = async (): Promise<void> => {
    setSaving('saving');
    setProblems(NO_PROBLEMS);
    const body = draftBody(version, points);
    const result = await publishTerms(fetch, org, body);
    if (result.at === 'published') {
      setSaving('saved');
      setPublished(body.version);
      setVersion(nextVersion(result.page.history));
      setPoints(draftOf(result.page.current, nextKey));
      setNextKey(nextKey + (result.page.current?.puntos.length ?? 0));
      onPublished(result.page);
    } else if (result.at === 'refused') {
      setProblems(problemsOf(result.problems));
      setSaving('failed');
    } else {
      setSaving('failed');
    }
  };

  const label =
    version.trim() === ''
      ? ui.publish.buttonBare
      : fill(ui.publish.button, { version: version.trim() });
  const hasProblems =
    problems.general.length > 0 ||
    problems.version.length > 0 ||
    Object.keys(problems.points).length > 0;

  return (
    <div className="normas-borrador" data-terms-editor>
      {page.current === null && points.length === 0 && <p className="saldo-nota">{ui.own.none}</p>}
      {points.length > 0 && <p className="saldo-nota">{ui.edit.kindHint}</p>}
      <ol className="normas-editores">
        {points.map((point, index) => (
          <PointEditor
            key={point.key}
            point={point}
            index={index}
            ui={ui}
            problems={problems.points[index] ?? {}}
            busy={busy}
            onChange={(next) => change(point.key, next)}
            onRemove={() => remove(point.key)}
          />
        ))}
      </ol>
      <div>
        <button
          type="button"
          className="btn btn-silencioso"
          disabled={busy || points.length >= MAX_POINTS}
          onClick={add}
          data-metric="panel-terms-add"
        >
          {ui.edit.add}
        </button>
        {points.length >= MAX_POINTS && <span className="saldo-nota"> {ui.edit.full}</span>}
      </div>

      <div className="gente-campo">
        <label htmlFor="normas-version">{ui.publish.versionLabel}</label>
        <input
          id="normas-version"
          value={version}
          maxLength={16}
          autoComplete="off"
          disabled={busy}
          aria-invalid={problems.version.length > 0}
          aria-describedby={
            problems.version.length > 0 ? 'normas-version-p' : 'normas-version-ayuda'
          }
          onChange={(event) => setVersion(event.target.value)}
        />
        <p className="saldo-nota" id="normas-version-ayuda">
          {ui.publish.versionHint}
        </p>
        <Problems id="normas-version-p" lines={problems.version} />
      </div>

      {hasProblems && (
        <div className="normas-aviso" role="alert" data-terms-refused>
          <p>{ui.publish.problems}</p>
          {problems.general.length > 0 && (
            <Problems id="normas-general-p" lines={problems.general} />
          )}
        </div>
      )}

      <div className="normas-acciones">
        <button
          type="button"
          className="btn btn-primario"
          disabled={busy}
          onClick={() => void publish()}
          data-metric="panel-terms-publish"
        >
          {label}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          disabled={busy}
          onClick={discard}
          data-metric="panel-terms-discard"
        >
          {ui.publish.discard}
        </button>
        <span className="saldo-nota">{ui.publish.note}</span>
      </div>
      <p className="saldo-nota" role="status" data-terms-status={saving}>
        {saving === 'saving' && ui.publish.publishing}
        {saving === 'saved' && fill(ui.publish.done, { version: published })}
        {saving === 'failed' && !hasProblems && ui.publish.failed}
      </p>
    </div>
  );
}

function History({
  history,
  ui,
  locale,
}: {
  readonly history: readonly TermsVersion[];
  readonly ui: PanelTermsMessages;
  readonly locale: SupportedLocale;
}) {
  const newest = [...history].reverse();
  return (
    <section className="normas-historial" aria-labelledby="normas-historial-t" data-terms-history>
      <h3 className="normas-h3" id="normas-historial-t">
        {ui.history.title}
      </h3>
      {newest.length === 0 ? (
        <p className="saldo-nota">{ui.history.empty}</p>
      ) : (
        <ul className="normas-versiones">
          {newest.map((past, index) => (
            <li key={past.version} data-terms-version={past.version}>
              <b>v{past.version}</b>
              <span>{dateOf(past.publishedAt, locale)}</span>
              <span className="saldo-nota">
                {fill(ui.history.points, { count: past.puntos.length })}
                {index === 0 ? ` · ${ui.history.inForce}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The section. `org` is the community whose Ajustes these are. */
export function PanelNormas({
  org,
  ui,
  locale,
}: {
  readonly org: string;
  readonly ui: PanelTermsMessages;
  readonly locale: SupportedLocale;
}) {
  const [read, setRead] = useState<Read>({ at: 'loading' });
  const [page, setPage] = useState<TermsPage | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    const loaded = await loadTerms(fetch, org);
    setPage(loaded);
    setRead(loaded === null ? { at: 'failed' } : { at: 'ready' });
  }, [org]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      className="tarjeta ajustes-tarjeta"
      aria-labelledby="settings-terms-t"
      data-settings-terms
      data-state={read.at}
    >
      <h2 className="ajustes-h2" id="settings-terms-t">
        <PanelGlyph name="scroll" size={18} />
        {ui.title}
      </h2>
      <p className="saldo-nota">{ui.lead}</p>

      <NuminiaFixed ui={ui} locale={locale} />

      {read.at === 'loading' && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {ui.loading}
        </p>
      )}
      {(read.at === 'failed' || (read.at === 'ready' && page === null)) && (
        <div className="saldo-fallo" role="alert" data-terms-failed>
          <p>{ui.failed}</p>
          <div>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void load()}
              data-metric="panel-terms-retry"
            >
              {ui.retry}
            </button>
          </div>
        </div>
      )}
      {read.at === 'ready' && page !== null && (
        <>
          <p className="etiqueta normas-etiqueta">
            {ui.own.label}
            {page.current !== null &&
              ` · ${fill(ui.own.inForce, { version: page.current.version })}`}
          </p>
          {page.mayEdit ? (
            <Editor org={org} page={page} ui={ui} onPublished={setPage} />
          ) : (
            <>
              <p className="saldo-nota" data-terms-readonly>
                {ui.readOnly}
              </p>
              {page.current === null ? (
                <p className="saldo-nota">{ui.own.noneRead}</p>
              ) : (
                <ReadOnlyPoints version={page.current} ui={ui} />
              )}
            </>
          )}
          <History history={page.history} ui={ui} locale={locale} />
        </>
      )}
    </section>
  );
}
