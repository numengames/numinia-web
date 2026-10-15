/**
 * «Miembros y roles» (the island, a face of Saldo): who is in an
 * organization and what each role lets them do. Asks /api/saldo for the
 * organizations, /api/saldo/roles for the one chosen and shows only what
 * the till answers; every change is a POST to /api/saldo and the answer
 * is the organization as it is now. The till decides on every write: the
 * screen only leaves out what the person cannot do (`mayEdit`,
 * `assignable`), so no button fails.
 *
 * Giving «Administrador» or «Gestionar roles» needs a fresh signature of
 * the wallet (STD-051, ORG-008): when /api/saldo answers so, the screen
 * has the wallet sign the lines of that very act (./wallet-signature.ts)
 * and sends it again with the proof — or says why it could not.
 */

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import {
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_PERMISSION_LABELS,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  fill,
  formatAt,
  needsSentence,
  needsSignature,
  readLog,
  readOverview,
  readProblem,
  readResult,
  readRoles,
  readRolesView,
  shortWallet,
  stepPosition,
  type DeskAccount,
  type DeskLogLine,
  type DeskRole,
  type DeskRoles,
  type PostResult,
} from '../../lib/accounts';
import { LunaEspera } from '../chrome/LunaEspera';
import { signAct, type Signed } from './wallet-signature';

type Phase =
  | { readonly at: 'loading' }
  | { readonly at: 'signed-out' }
  | { readonly at: 'not-bound' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly teams: readonly DeskAccount[] };

type Sheet =
  | { readonly at: 'loading' }
  | { readonly at: 'failed'; readonly text: string }
  | { readonly at: 'ready'; readonly view: DeskRoles; readonly you: string | null };

type LogState =
  | { readonly at: 'closed' }
  | { readonly at: 'loading' }
  | { readonly at: 'failed'; readonly text: string }
  | { readonly at: 'ready'; readonly lines: readonly DeskLogLine[] };

interface Draft {
  readonly name: string;
  readonly color: string | null;
  readonly hoist: boolean;
  readonly permissions: readonly OrganizationPermission[];
}

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };
const SWATCHES = ['#c0392b', '#d98324', '#c9a227', '#3d8b5f', '#2f7fa8', '#6b5ca5', '#a8477a'];

/** POST one action; the desk's answer, or null when the API failed. */
async function post(body: Readonly<Record<string, unknown>>): Promise<PostResult | null> {
  try {
    const response = await fetch('/api/saldo', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    });
    const json: unknown = await response.json().catch(() => null);
    return response.ok ? readResult(json) : null;
  } catch {
    return null;
  }
}

function RoleDot({ color }: { readonly color: string | null }) {
  return (
    <span
      className="saldo-punto-rol"
      aria-hidden="true"
      style={color === null ? undefined : { background: color }}
    />
  );
}

/** One role's draft: its name, colour, whether it shows apart and what it allows. */
function RoleForm({
  ui,
  locale,
  idBase,
  initial,
  busy,
  submit,
  onSubmit,
  onCancel,
}: {
  readonly ui: SaldoMessages;
  readonly locale: SupportedLocale;
  readonly idBase: string;
  readonly initial: Draft;
  readonly busy: boolean;
  readonly submit: string;
  readonly onSubmit: (draft: Draft) => Promise<boolean>;
  readonly onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [hoist, setHoist] = useState(initial.hoist);
  const [permissions, setPermissions] = useState(initial.permissions);
  const words = ui.panel;

  const toggle = (permission: OrganizationPermission): void =>
    setPermissions((held) =>
      held.includes(permission) ? held.filter((p) => p !== permission) : [...held, permission],
    );
  const send = async (event: SyntheticEvent): Promise<void> => {
    event.preventDefault();
    const ordered = ORGANIZATION_PERMISSIONS.filter((p) => permissions.includes(p));
    await onSubmit({ name, color, hoist, permissions: ordered });
  };

  return (
    <form className="saldo-marco saldo-rol-form" onSubmit={(event) => void send(event)}>
      <label htmlFor={`${idBase}-nombre`}>{words.name}</label>
      <input
        id={`${idBase}-nombre`}
        value={name}
        maxLength={100}
        autoComplete="off"
        onChange={(event) => setName(event.target.value)}
      />
      <fieldset className="saldo-fieldset">
        <legend>{words.color}</legend>
        <div className="saldo-colores">
          <label className="saldo-color">
            <input
              type="radio"
              name={`${idBase}-color`}
              checked={color === null}
              onChange={() => setColor(null)}
            />
            <span>{words.noColor}</span>
          </label>
          {SWATCHES.map((swatch) => (
            <label key={swatch} className="saldo-color">
              <input
                type="radio"
                name={`${idBase}-color`}
                checked={color === swatch}
                onChange={() => setColor(swatch)}
              />
              <RoleDot color={swatch} />
              <span className="sr-only">{swatch}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="saldo-casilla">
        <input type="checkbox" checked={hoist} onChange={() => setHoist((on) => !on)} />
        <span>{words.showApart}</span>
      </label>
      <fieldset className="saldo-fieldset">
        <legend>{words.permissions}</legend>
        <ul className="saldo-permisos">
          {ORGANIZATION_PERMISSIONS.map((permission) => (
            <li key={permission}>
              <label className="saldo-casilla">
                <input
                  type="checkbox"
                  checked={permissions.includes(permission)}
                  aria-describedby={needsSignature(permission) ? `${idBase}-firma` : undefined}
                  onChange={() => toggle(permission)}
                />
                <span>{ORGANIZATION_PERMISSION_LABELS[permission][locale]}</span>
              </label>
            </li>
          ))}
        </ul>
        <p className="saldo-nota" id={`${idBase}-firma`}>
          {words.signatureNote}
        </p>
      </fieldset>
      <div className="saldo-botones">
        <button
          type="submit"
          className="btn btn-primario"
          disabled={busy}
          data-metric="saldo-role-save"
        >
          {submit}
        </button>
        <button type="button" className="btn btn-silencioso" onClick={onCancel}>
          {words.cancel}
        </button>
      </div>
    </form>
  );
}

export function MiembrosPanel({
  ui,
  lang,
  locale,
  signIn,
}: {
  readonly ui: SaldoMessages;
  readonly lang: string;
  readonly locale: SupportedLocale;
  readonly signIn: string;
}) {
  const words = ui.panel;
  const [phase, setPhase] = useState<Phase>({ at: 'loading' });
  const [current, setCurrent] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>({ at: 'loading' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [giving, setGiving] = useState<Readonly<Record<string, string>>>({});
  const [log, setLog] = useState<LogState>({ at: 'closed' });
  // While the wallet is asked to sign an act (ORG-008).
  const [signing, setSigning] = useState(false);
  // Only the newest organization read may paint.
  const asked = useRef(0);

  const problemText = useCallback(
    (problems: readonly string[]): string => {
      const { key, act, holders } = readProblem(problems);
      if (key === 'needs' && act !== undefined) {
        return needsSentence(
          ui.problems,
          ORGANIZATION_PERMISSION_LABELS[act][locale],
          holders ?? null,
        );
      }
      return key === 'notConfigured' || key === 'needs' ? ui.problems.other : ui.problems[key];
    },
    [ui, locale],
  );

  /** Why the wallet did not sign, in words. */
  const unsignedText = (signed: Extract<Signed, { readonly ok: false }>): string => {
    if (signed.problem === 'no-wallet') return words.noWallet;
    if (signed.problem === 'other-wallet') return words.otherWallet;
    if (signed.problem === 'declined') return words.declined;
    return signed.problems === undefined ? ui.failed : problemText(signed.problems);
  };

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/saldo', { headers: { accept: 'application/json' } });
      const json: unknown = await response.json().catch(() => null);
      if (response.status === 401) return setPhase({ at: 'signed-out' });
      if (response.status === 503) return setPhase({ at: 'not-bound' });
      const accounts = response.ok ? readOverview(json) : null;
      if (accounts === null) return setPhase({ at: 'failed' });
      const teams = accounts.filter((account) => account.kind === 'team');
      setPhase({ at: 'ready', teams });
      setCurrent((id) =>
        id !== null && teams.some((team) => team.id === id) ? id : (teams[0]?.id ?? null),
      );
    } catch {
      setPhase({ at: 'failed' });
    }
  }, []);

  const loadRoles = useCallback(
    async (id: string): Promise<void> => {
      const mine = ++asked.current;
      setSheet({ at: 'loading' });
      setLog({ at: 'closed' });
      setEditing(null);
      setRemoving(null);
      try {
        const response = await fetch(`/api/saldo/roles?cuenta=${encodeURIComponent(id)}`, {
          headers: { accept: 'application/json' },
        });
        const json: unknown = await response.json().catch(() => null);
        if (mine !== asked.current) return;
        const read = response.ok ? readRoles(json) : null;
        if (read !== null) return setSheet({ at: 'ready', view: read.roles, you: read.you });
        const problems =
          response.status === 403 && typeof json === 'object' && json !== null
            ? (json as { problems?: unknown }).problems
            : null;
        setSheet({
          at: 'failed',
          text: Array.isArray(problems) ? problemText(problems.map(String)) : ui.failed,
        });
      } catch {
        if (mine === asked.current) setSheet({ at: 'failed', text: ui.failed });
      }
    },
    [ui, problemText],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);
  useEffect(() => {
    if (current !== null) void loadRoles(current);
  }, [current, loadRoles]);

  /** One change: the organization as it is now, or why not. */
  const act = async (body: Readonly<Record<string, unknown>>): Promise<boolean> => {
    if (busy || current === null || sheet.at !== 'ready') return false;
    setBusy(true);
    setNotice(null);
    const request = { ...body, accountId: current };
    let result = await post(request);
    // ORG-008: what gives «Administrador» or «Gestionar roles» asks the
    // wallet to sign this very act, and goes again with the proof.
    if (result !== null && !result.ok && readProblem(result.problems).key === 'freshSignature') {
      setSigning(true);
      const signed = await signAct(request, locale, sheet.you);
      setSigning(false);
      if (!signed.ok) {
        setBusy(false);
        setNotice(unsignedText(signed));
        return false;
      }
      result = await post({ ...request, fresh: signed.proof });
    }
    setBusy(false);
    if (result === null) {
      setNotice(ui.failed);
      return false;
    }
    if (!result.ok) {
      setNotice(problemText(result.problems));
      return false;
    }
    const view = readRolesView(result);
    if (view === null) {
      setNotice(ui.failed);
      return false;
    }
    setSheet({ at: 'ready', view, you: sheet.you });
    setLog((state) => (state.at === 'closed' ? state : { at: 'closed' }));
    return true;
  };

  const toggleLog = async (): Promise<void> => {
    if (log.at !== 'closed') return setLog({ at: 'closed' });
    if (current === null) return;
    setLog({ at: 'loading' });
    try {
      const response = await fetch(`/api/saldo/log?cuenta=${encodeURIComponent(current)}`, {
        headers: { accept: 'application/json' },
      });
      const json: unknown = await response.json().catch(() => null);
      const lines = response.ok ? readLog(json) : null;
      if (lines !== null) return setLog({ at: 'ready', lines });
      const problems =
        response.status === 403 && typeof json === 'object' && json !== null
          ? (json as { problems?: unknown }).problems
          : null;
      setLog({
        at: 'failed',
        text: Array.isArray(problems) ? problemText(problems.map(String)) : ui.failed,
      });
    } catch {
      setLog({ at: 'failed', text: ui.failed });
    }
  };

  if (phase.at === 'loading') {
    return (
      <div className="saldo-estado" role="status">
        <LunaEspera /> {ui.loading}
      </div>
    );
  }
  if (phase.at === 'signed-out') {
    return (
      <div className="saldo-marco saldo-puerta" data-saldo-signed-out>
        <h2>{ui.signedOut.title}</h2>
        <p className="saldo-nota">{ui.signedOut.text}</p>
        <div>
          <a className="btn btn-primario" href={signIn} data-metric="saldo-signin">
            {ui.signedOut.cta}
          </a>
        </div>
      </div>
    );
  }
  if (phase.at === 'not-bound' || phase.at === 'failed') {
    return (
      <div className="saldo-marco saldo-fallo" role="alert">
        <p>{phase.at === 'not-bound' ? ui.notBound : ui.failed}</p>
        <div>
          <button type="button" className="btn btn-fantasma" onClick={() => void loadOverview()}>
            {ui.retry}
          </button>
        </div>
      </div>
    );
  }
  if (phase.teams.length === 0) {
    return (
      <p className="saldo-marco saldo-nota" data-panel-no-organization>
        {words.noOrganization}
      </p>
    );
  }

  const view = sheet.at === 'ready' ? sheet.view : null;
  const you = sheet.at === 'ready' ? sheet.you : null;
  const roleName = (id: string): string => view?.roles.find((role) => role.id === id)?.name ?? '';
  const draftOf = (role: DeskRole): Draft => ({
    name: role.name,
    color: role.color,
    hoist: role.hoist,
    permissions: role.permissions,
  });

  return (
    <div className="saldo-panel" data-panel-members>
      {phase.teams.length > 1 && (
        <div className="saldo-selector">
          <label htmlFor="panel-org">{words.organization}</label>
          <select
            id="panel-org"
            value={current ?? ''}
            onChange={(event) => setCurrent(event.target.value)}
          >
            {phase.teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div aria-live="polite">
        {signing && (
          <p className="saldo-nota" role="status" data-panel-signing>
            {words.signing}
          </p>
        )}
        {notice !== null && (
          <p className="saldo-mal saldo-aviso" role="alert">
            {notice}
          </p>
        )}
      </div>

      {sheet.at === 'loading' && (
        <div className="saldo-estado" role="status">
          <LunaEspera /> {ui.loading}
        </div>
      )}
      {sheet.at === 'failed' && (
        <div className="saldo-marco saldo-fallo" role="alert">
          <p>{sheet.text}</p>
          <div>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => current !== null && void loadRoles(current)}
            >
              {ui.retry}
            </button>
          </div>
        </div>
      )}

      {view !== null && (
        <>
          {view.as === 'house' && (
            <p className="saldo-marco saldo-casa" data-panel-house>
              {words.house}
            </p>
          )}
          {view.as === 'owner' && (
            <p className="saldo-nota" data-panel-owner>
              {words.ownerStrip}
            </p>
          )}

          <section className="saldo-seccion" aria-labelledby="panel-roles-t" data-panel-roles>
            <div className="saldo-cabeza">
              <h2 className="etiqueta" id="panel-roles-t">
                {words.rolesTitle}
              </h2>
              {editing !== 'new' && (
                <button
                  type="button"
                  className="btn btn-fantasma"
                  disabled={busy}
                  onClick={() => setEditing('new')}
                  data-metric="saldo-role-new"
                >
                  + {words.newRole}
                </button>
              )}
            </div>
            {editing === 'new' && (
              <RoleForm
                ui={ui}
                locale={locale}
                idBase="rol-nuevo"
                initial={{ name: '', color: null, hoist: false, permissions: [] }}
                busy={busy}
                submit={words.create}
                onCancel={() => setEditing(null)}
                onSubmit={async (draft) => {
                  const done = await act({ action: 'create-role', role: draft });
                  if (done) setEditing(null);
                  return done;
                }}
              />
            )}
            <ul className="saldo-roles">
              {view.roles.map((role) => {
                const base = role.position === 0;
                const up = stepPosition(view.roles, role, 1);
                const down = stepPosition(view.roles, role, -1);
                return (
                  <li key={role.id} className="saldo-marco saldo-rol" data-role={role.id}>
                    <div className="saldo-rol-cabeza">
                      <span className="saldo-rol-nombre">
                        <RoleDot color={role.color} />
                        <strong>{role.name}</strong>
                        {role.hoist && <span className="saldo-chip">{words.apart}</span>}
                      </span>
                      <span className="saldo-nota">
                        {base ? words.base : fill(words.holders, { n: role.members })}
                      </span>
                    </div>
                    {role.permissions.length > 0 && (
                      <p className="saldo-nota">
                        {role.permissions
                          .map((permission) => ORGANIZATION_PERMISSION_LABELS[permission][locale])
                          .join(' · ')}
                      </p>
                    )}
                    {(role.mayEdit || base) && editing !== role.id && removing !== role.id && (
                      <div className="saldo-acciones">
                        <button
                          type="button"
                          className="btn btn-silencioso"
                          disabled={busy}
                          onClick={() => setEditing(role.id)}
                          data-metric="saldo-role-edit"
                        >
                          {words.edit}
                        </button>
                        {role.mayEdit && up !== null && (
                          <button
                            type="button"
                            className="btn btn-silencioso"
                            disabled={busy}
                            aria-label={`${words.moveUp}: ${role.name}`}
                            onClick={() =>
                              void act({ action: 'move-role', roleId: role.id, position: up })
                            }
                            data-metric="saldo-role-up"
                          >
                            {words.moveUp}
                          </button>
                        )}
                        {role.mayEdit && down !== null && (
                          <button
                            type="button"
                            className="btn btn-silencioso"
                            disabled={busy}
                            aria-label={`${words.moveDown}: ${role.name}`}
                            onClick={() =>
                              void act({ action: 'move-role', roleId: role.id, position: down })
                            }
                            data-metric="saldo-role-down"
                          >
                            {words.moveDown}
                          </button>
                        )}
                        {role.mayEdit && (
                          <button
                            type="button"
                            className="btn btn-silencioso saldo-quitar"
                            disabled={busy}
                            aria-label={`${words.remove}: ${role.name}`}
                            onClick={() => setRemoving(role.id)}
                            data-metric="saldo-role-delete"
                          >
                            {words.remove}
                          </button>
                        )}
                      </div>
                    )}
                    {removing === role.id && (
                      <div className="saldo-confirmar" role="group" aria-label={words.remove}>
                        <p>{fill(words.confirmRemove, { name: role.name })}</p>
                        <div className="saldo-botones">
                          <button
                            type="button"
                            className="btn btn-primario saldo-quitar"
                            disabled={busy}
                            onClick={() =>
                              void act({ action: 'delete-role', roleId: role.id }).then(
                                (done) => done && setRemoving(null),
                              )
                            }
                            data-metric="saldo-role-delete-confirm"
                          >
                            {words.confirm}
                          </button>
                          <button
                            type="button"
                            className="btn btn-silencioso"
                            onClick={() => setRemoving(null)}
                          >
                            {words.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                    {editing === role.id && (
                      <RoleForm
                        ui={ui}
                        locale={locale}
                        idBase={`rol-${role.id}`}
                        initial={draftOf(role)}
                        busy={busy}
                        submit={words.save}
                        onCancel={() => setEditing(null)}
                        onSubmit={async (draft) => {
                          // The base role keeps its name and its place: only what it carries changes.
                          const change = base ? { permissions: draft.permissions } : { ...draft };
                          const done = await act({
                            action: 'edit-role',
                            roleId: role.id,
                            change,
                          });
                          if (done) setEditing(null);
                          return done;
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="saldo-seccion" aria-labelledby="panel-gente-t" data-panel-people>
            <h2 className="etiqueta" id="panel-gente-t">
              {words.membersTitle}
            </h2>
            <ul className="saldo-gente">
              {view.members.map((member) => {
                const who = shortWallet(member.wallet);
                const free = view.roles.filter(
                  (role) =>
                    member.assignable.includes(role.id) && !member.roleIds.includes(role.id),
                );
                const chosen = giving[member.wallet] ?? free[0]?.id ?? '';
                return (
                  <li key={member.wallet} className="saldo-marco saldo-persona">
                    <div className="saldo-rol-cabeza">
                      <span className="mono">
                        {who}
                        {member.wallet === you && <span className="saldo-tu"> ({words.you})</span>}
                      </span>
                      {member.owner && <span className="saldo-chip">{words.owner}</span>}
                    </div>
                    <div className="saldo-fichas">
                      {member.roleIds.length === 0 && !member.owner && (
                        <span className="saldo-nota">{words.noRolesYet}</span>
                      )}
                      {member.roleIds.map((id) => (
                        <span key={id} className="saldo-chip">
                          {roleName(id)}
                          {member.assignable.includes(id) && (
                            <button
                              type="button"
                              className="saldo-chip-x"
                              disabled={busy}
                              aria-label={fill(words.take, { role: roleName(id), who })}
                              onClick={() =>
                                void act({ action: 'take-role', wallet: member.wallet, roleId: id })
                              }
                              data-metric="saldo-role-take"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {free.length > 0 && (
                      <div className="saldo-linea-form">
                        <label className="sr-only" htmlFor={`dar-${member.wallet}`}>
                          {fill(words.giveLabel, { who })}
                        </label>
                        <select
                          id={`dar-${member.wallet}`}
                          value={chosen}
                          onChange={(event) =>
                            setGiving((now) => ({ ...now, [member.wallet]: event.target.value }))
                          }
                        >
                          {free.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn btn-fantasma"
                          disabled={busy}
                          onClick={() =>
                            void act({ action: 'give-role', wallet: member.wallet, roleId: chosen })
                          }
                          data-metric="saldo-role-give"
                        >
                          {words.give}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="saldo-seccion" aria-labelledby="panel-registro-t" data-panel-log>
            <div className="saldo-cabeza">
              <h2 className="etiqueta" id="panel-registro-t">
                {words.logTitle}
              </h2>
              <button
                type="button"
                className="btn btn-silencioso"
                aria-expanded={log.at !== 'closed'}
                onClick={() => void toggleLog()}
                data-metric="saldo-log-toggle"
              >
                {log.at === 'closed' ? words.showLog : words.hideLog}
              </button>
            </div>
            {log.at === 'loading' && (
              <div className="saldo-estado" role="status">
                <LunaEspera /> {ui.loading}
              </div>
            )}
            {log.at === 'failed' && <p className="saldo-nota">{log.text}</p>}
            {log.at === 'ready' && log.lines.length === 0 && (
              <p className="saldo-nota">{words.logEmpty}</p>
            )}
            {log.at === 'ready' && log.lines.length > 0 && (
              <ol className="saldo-registro">
                {log.lines.map((line) => (
                  <li key={line.seq}>
                    <span className="mono saldo-fecha">{formatAt(line.at, lang)}</span>
                    <span>
                      {words.logAct[line.act] ?? line.act}
                      {line.detail?.['name'] !== undefined && ` · ${line.detail['name']}`}
                      {line.subject !== null && ` → ${shortWallet(line.subject)}`}
                    </span>
                    <span className="mono saldo-fecha">{shortWallet(line.actor)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
