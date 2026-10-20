/**
 * «Agentes» inside the panel: the community's AIs, one row each — name, the
 * roles as chips, an Encendida/Apagada switch, the state (Activa / Dormida),
 * what the till says its next pass is, who answers for it and «Quitar» with
 * a confirmation — and the invitation (./AgentInvite.tsx). An AI made with a
 * token also shows its token's start and day, and «Renovar token» (with a
 * confirmation); the new secret, like the first, is shown once (./AgentToken.tsx). Each row
 * says how its AI was connected (`via`: from the panel, or from an app's host);
 * one connected from an app by URL has «Desconectar» instead of «Renovar
 * token», which is the token's revoke. Above the list, «Conecta tu IA»
 * (./AgentConnect.tsx) gives the relay's address. It talks to
 * /api/saldo/agents (lib/agents-source.ts), which answers the whole list
 * after every write, so the screen never guesses what changed.
 *
 * The till decides on every write: the controls the person cannot use are
 * disabled or left out (`mayEdit`, `assignable`), and when the till refuses
 * anyway the refusal is told in a sentence, never as a code. The roles'
 * names come from GET /api/saldo/roles (the same answer Miembros reads);
 * where that fails, the ones the person may assign are still named.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ORGANIZATION_PERMISSION_LABELS, type SupportedLocale } from '@numinia/domain';
import type { WorldAiMessages } from '../../i18n/mundos';
import type { PanelMessages } from '../../i18n/panel';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import {
  fill,
  needsSentence,
  readRoles,
  type AgentState,
  type DeskAgent,
  type DeskAgents,
} from '../../lib/accounts';
import {
  changeBody,
  chipsOf,
  connectionOf,
  disconnectable,
  failureOf,
  listUrl,
  readAgents,
  readToken,
  refusalOf,
  removeUrl,
  responsibleOf,
  rolesToGive,
  tokenLine,
  type Change,
  type Failure,
} from '../../lib/panel-agentes';
import { LunaEspera } from '../chrome/LunaEspera';
import { ConnectBlock } from './AgentConnect';
import { InviteDialog, type Draft } from './AgentInvite';
import { TokenOnceDialog } from './AgentToken';
import { PanelFrame } from './PanelFrame';
import { PanelGlyph } from './PanelGlyph';
import { RoleDot } from './PeopleBits';

type Named = readonly { id: string; name: string; color: string | null; position: number }[];

type Sheet =
  | { readonly at: 'loading' }
  | { readonly at: 'failed'; readonly failure: Failure }
  | { readonly at: 'ready'; readonly view: DeskAgents };

interface Notice {
  readonly tone: 'alert' | 'status';
  readonly text: string;
}

const JSON_HEADERS = { accept: 'application/json', 'content-type': 'application/json' };

type Called =
  | { readonly ok: true; readonly view: DeskAgents; readonly token: string | null }
  | { readonly ok: false; readonly failure: Failure };

/** One call to /api/saldo/agents: the list as it is now, or why not. */
async function call(url: string, init?: RequestInit): Promise<Called> {
  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, ...init });
    const json: unknown = await response.json().catch(() => null);
    if (response.ok) {
      const view = readAgents(json);
      return view === null
        ? { ok: false, failure: { kind: 'failed' } }
        : { ok: true, view, token: readToken(json) };
    }
    return { ok: false, failure: failureOf(response.status, json) };
  } catch {
    return { ok: false, failure: { kind: 'failed' } };
  }
}

function Chip({
  agent,
  role,
  removable,
  busy,
  words,
  onTake,
}: {
  readonly agent: DeskAgent;
  readonly role: { readonly id: string; readonly name: string; readonly color: string | null };
  readonly removable: boolean;
  readonly busy: boolean;
  readonly words: AgentesMessages;
  readonly onTake: () => void;
}) {
  return (
    <li className="saldo-chip agentes-chip" data-agent-role={role.id}>
      <RoleDot color={role.color} />
      {role.name}
      {removable && (
        <button
          type="button"
          className="saldo-chip-x"
          onClick={onTake}
          disabled={busy}
          aria-label={fill(words.takeRole, { role: role.name, name: agent.name })}
          data-metric="panel-agentes-role-take"
        >
          ×
        </button>
      )}
    </li>
  );
}

function RoleGiver({
  agent,
  options,
  busy,
  words,
  onGive,
}: {
  readonly agent: DeskAgent;
  readonly options: DeskAgents['assignableRoles'];
  readonly busy: boolean;
  readonly words: AgentesMessages;
  readonly onGive: (roleId: string) => void;
}) {
  const [picked, setPicked] = useState('');
  return (
    <div className="agentes-dar">
      <select
        className="agentes-selector"
        value={picked}
        onChange={(event) => setPicked(event.target.value)}
        disabled={busy}
        aria-label={fill(words.giveLabel, { name: agent.name })}
        data-metric="panel-agentes-role-select"
      >
        <option value="">{words.givePlaceholder}</option>
        {options.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-fantasma"
        disabled={busy || picked === ''}
        onClick={() => {
          onGive(picked);
          setPicked('');
        }}
        data-metric="panel-agentes-role-give"
      >
        {words.give}
      </button>
    </div>
  );
}

/** «Desconectar» on a row connected from an app: a confirmation, then the token's revoke. */
function Disconnect({
  agent,
  host,
  busy,
  words,
  onDisconnect,
}: {
  readonly agent: DeskAgent;
  readonly host: string;
  readonly busy: boolean;
  readonly words: AgentesMessages;
  readonly onDisconnect: () => Promise<boolean>;
}) {
  const [step, setStep] = useState<'idle' | 'asking' | 'busy'>('idle');
  const say = words.connection;
  const label = fill(say.disconnectLabel, { name: agent.name });
  if (step === 'idle') {
    return (
      <div className="agentes-renovar" data-agent-disconnect>
        <button
          type="button"
          className="btn btn-fantasma"
          disabled={busy}
          onClick={() => setStep('asking')}
          aria-label={label}
          data-metric="panel-agentes-disconnect"
        >
          {say.disconnect}
        </button>
      </div>
    );
  }
  return (
    <div className="agentes-renovar" data-agent-disconnect>
      <div className="mundo-ia-confirmar agentes-confirmar" role="group" aria-label={label}>
        <span className="saldo-nota">{fill(say.disconnectAsk, { name: agent.name, host })}</span>
        <button
          type="button"
          className="btn btn-fantasma"
          disabled={step === 'busy'}
          aria-busy={step === 'busy'}
          onClick={() => {
            setStep('busy');
            void onDisconnect().then(() => setStep('idle'));
          }}
          data-metric="panel-agentes-disconnect-yes"
        >
          {step === 'busy' ? say.disconnecting : say.disconnectYes}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          disabled={step === 'busy'}
          onClick={() => setStep('idle')}
          data-metric="panel-agentes-disconnect-no"
        >
          {say.disconnectNo}
        </button>
      </div>
    </div>
  );
}

function Row({
  agent,
  view,
  named,
  busy,
  words,
  locale,
  onChange,
  onRemove,
  onRenew,
  onDisconnect,
}: {
  readonly locale: SupportedLocale;
  readonly agent: DeskAgent;
  readonly view: DeskAgents;
  readonly named: Named;
  readonly busy: boolean;
  readonly words: AgentesMessages;
  readonly onChange: (change: Change) => void;
  readonly onRemove: () => Promise<boolean>;
  readonly onRenew: () => Promise<boolean>;
  readonly onDisconnect: () => Promise<boolean>;
}) {
  const uid = useId();
  const connection = connectionOf(agent);
  const host = connection?.kind === 'url' ? connection.host : null;
  const [asking, setAsking] = useState(false);
  const [renewing, setRenewing] = useState<'idle' | 'asking' | 'busy'>('idle');
  const line = tokenLine(agent);
  const [removing, setRemoving] = useState(false);
  const chips = chipsOf(agent, named);
  const options = rolesToGive(agent, view);
  const editable = agent.mayEdit && !busy;
  const nameId = `${uid}-n`;
  const onoffId = `${uid}-o`;
  const hearId = `${uid}-h`;

  return (
    <li className="agentes-fila" data-agent={agent.id} data-agent-status={agent.status}>
      <div className="agentes-cabeza">
        <PanelGlyph name="robot" size={18} />
        <span className="agentes-nombre" id={nameId}>
          {agent.name}
        </span>
        <span className="agentes-onoff">
          <button
            type="button"
            role="switch"
            aria-checked={agent.enabled}
            aria-labelledby={`${nameId} ${onoffId}`}
            className="gente-interruptor"
            disabled={!editable}
            onClick={() => onChange({ enabled: !agent.enabled })}
            data-metric="panel-agentes-switch"
          />
          <span id={onoffId} data-agent-onoff>
            {agent.enabled ? words.on : words.off}
          </span>
        </span>
      </div>

      <p className="agentes-linea" data-agent-status-line>
        {words.status[agent.status]}
      </p>
      {connection !== null && (
        <p className="saldo-nota agentes-linea" data-agent-via={connection.kind}>
          {host === null ? words.connection.panel : fill(words.connection.url, { host })}
        </p>
      )}
      {host !== null && agent.auth === 'token' && line === null && (
        <p className="agentes-linea" data-agent-url-none>
          {fill(words.connection.urlNone, { host })}
        </p>
      )}
      {agent.auth === 'token' && host === null && (
        <p className="agentes-linea agentes-token-linea" data-agent-token-line>
          {line === null
            ? words.access.rowNone
            : fill(words.access.rowLine, {
                prefix: line.shown,
                day: new Date(`${line.day}T00:00:00Z`).toLocaleDateString(locale, {
                  dateStyle: 'long',
                  timeZone: 'UTC',
                }),
              })}
        </p>
      )}
      <p className="saldo-nota agentes-linea" data-agent-responsible>
        {fill(words.responsible, { name: responsibleOf(agent) })}
      </p>

      <div className="agentes-oir" data-agent-hear={agent.hears ? 'on' : 'off'}>
        <button
          type="button"
          role="switch"
          aria-checked={agent.hears}
          aria-labelledby={`${nameId} ${hearId}`}
          aria-describedby={`${hearId}-hint`}
          className="gente-interruptor"
          disabled={!editable}
          onClick={() => onChange({ hears: !agent.hears })}
          data-metric="panel-agentes-hear"
        />
        <span className="agentes-oir-texto">
          <span id={hearId}>{words.hearLabel}</span>
          <span className="saldo-nota" id={`${hearId}-hint`}>
            {words.hearHint}
          </span>
        </span>
      </div>

      <fieldset className="agentes-estado" disabled={!editable} data-agent-state={agent.state}>
        <legend>{words.stateLabel}</legend>
        {(['activa', 'dormida'] as const satisfies readonly AgentState[]).map((state) => (
          <label
            key={state}
            className="agentes-opcion"
            data-agent-state-option={state}
            data-selected={agent.state === state}
          >
            <input
              type="radio"
              name={`${uid}-estado`}
              value={state}
              checked={agent.state === state}
              onChange={() => onChange({ state })}
              data-metric={`panel-agentes-state-${state}`}
            />
            <span className="agentes-opcion-cuerpo">
              <span className="agentes-opcion-nombre">
                {state === 'activa' ? (
                  <span className="agentes-punto" aria-hidden="true" data-agent-dot />
                ) : (
                  <span className="agentes-luna" aria-hidden="true" data-agent-moon>
                    <PanelGlyph name="moon" size={14} />
                  </span>
                )}
                {words.states[state].name}
              </span>
              <span className="saldo-nota">{words.states[state].hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="agentes-roles">
        <p className="etiqueta">{words.roles}</p>
        {chips.length === 0 ? (
          <p className="saldo-nota" data-agent-no-roles>
            {words.noRoles}
          </p>
        ) : (
          <ul className="agentes-chips" aria-label={words.roles}>
            {chips.map((chip) => (
              <Chip
                key={chip.id}
                agent={agent}
                role={chip}
                removable={chip.removable}
                busy={busy}
                words={words}
                onTake={() => onChange({ takeRole: chip.id })}
              />
            ))}
          </ul>
        )}
        {options.length > 0 && (
          <RoleGiver
            agent={agent}
            options={options}
            busy={busy}
            words={words}
            onGive={(roleId) => onChange({ giveRole: roleId })}
          />
        )}
      </div>

      {host !== null && disconnectable(agent) && (
        <Disconnect
          agent={agent}
          host={host}
          busy={busy}
          words={words}
          onDisconnect={onDisconnect}
        />
      )}
      {agent.mayEdit && agent.auth === 'token' && host === null && (
        <div className="agentes-renovar" data-agent-renew>
          {renewing === 'idle' ? (
            <button
              type="button"
              className="btn btn-fantasma"
              disabled={busy}
              onClick={() => setRenewing('asking')}
              aria-label={fill(words.access.renewLabel, { name: agent.name })}
              data-metric="panel-agentes-token-renew"
            >
              {words.access.renew}
            </button>
          ) : (
            <div
              className="mundo-ia-confirmar agentes-confirmar"
              role="group"
              aria-label={fill(words.access.renewLabel, { name: agent.name })}
            >
              <span className="saldo-nota">
                {fill(words.access.renewAsk, { name: agent.name })}
              </span>
              <button
                type="button"
                className="btn btn-fantasma"
                disabled={renewing === 'busy'}
                aria-busy={renewing === 'busy'}
                onClick={() => {
                  setRenewing('busy');
                  void onRenew().then(() => setRenewing('idle'));
                }}
                data-metric="panel-agentes-token-renew-yes"
              >
                {renewing === 'busy' ? words.access.renewing : words.access.renewYes}
              </button>
              <button
                type="button"
                className="btn btn-fantasma"
                disabled={renewing === 'busy'}
                onClick={() => setRenewing('idle')}
                data-metric="panel-agentes-token-renew-no"
              >
                {words.access.renewNo}
              </button>
            </div>
          )}
        </div>
      )}

      {!agent.mayEdit ? (
        <p className="saldo-nota agentes-linea" data-agent-read-only>
          {words.readOnly}
        </p>
      ) : asking ? (
        <div
          className="mundo-ia-confirmar agentes-confirmar"
          role="group"
          aria-label={fill(words.removeLabel, { name: agent.name })}
        >
          <span className="saldo-nota">{fill(words.removeAsk, { name: agent.name })}</span>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={removing}
            aria-busy={removing}
            onClick={() => {
              setRemoving(true);
              void onRemove().then((done) => {
                if (!done) {
                  setRemoving(false);
                  setAsking(false);
                }
              });
            }}
            data-metric="panel-agentes-remove-yes"
          >
            {removing ? words.removing : words.removeYes}
          </button>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={removing}
            onClick={() => setAsking(false)}
            data-metric="panel-agentes-remove-no"
          >
            {words.removeNo}
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={busy}
            onClick={() => setAsking(true)}
            aria-label={fill(words.removeLabel, { name: agent.name })}
            data-metric="panel-agentes-remove"
          >
            {words.remove}
          </button>
        </div>
      )}
    </li>
  );
}

function Agentes({
  org,
  locale,
  words: panelWords,
  ui,
  people,
  agentes,
  world,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly ui: SaldoMessages;
  readonly people: PeopleMessages;
  readonly agentes: AgentesMessages;
  readonly world: WorldAiMessages['dialog'];
}) {
  const [sheet, setSheet] = useState<Sheet>({ at: 'loading' });
  const [roles, setRoles] = useState<Named | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [inviting, setInviting] = useState(false);
  /** The secret just made, held only in this page's memory until «Ya lo he copiado». */
  const [issued, setIssued] = useState<{
    readonly agent: { readonly id: string; readonly name: string };
    readonly token: string;
  } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let wanted = true;
    setSheet({ at: 'loading' });
    void call(listUrl(org)).then((result) => {
      if (!wanted) return;
      setSheet(
        result.ok ? { at: 'ready', view: result.view } : { at: 'failed', failure: result.failure },
      );
    });
    // The roles' names: the same answer Miembros reads. Failing only means fewer names.
    void fetch(`/api/saldo/roles?cuenta=${encodeURIComponent(org)}`, {
      headers: { accept: 'application/json' },
    })
      .then(async (response) => {
        const read = response.ok ? readRoles(await response.json().catch(() => null)) : null;
        if (wanted) setRoles(read === null ? null : read.roles.roles);
      })
      .catch(() => {
        if (wanted) setRoles(null);
      });
    return () => {
      wanted = false;
    };
  }, [org, attempt]);

  /** A failure as one plain sentence. */
  const textOf = useCallback(
    (failure: Failure): string => {
      if (failure.kind !== 'refused') return agentes.failures[failure.kind];
      const refusal = refusalOf(failure.problems);
      if (refusal.kind === 'agent') return agentes.failures[refusal.problem];
      const { key, act, holders } = refusal.read;
      if (key === 'needs' && act !== undefined) {
        const label = people.roles.labels[act] ?? ORGANIZATION_PERMISSION_LABELS[act][locale];
        return needsSentence(ui.problems, label, holders ?? null);
      }
      return key === 'notConfigured' || key === 'needs' ? ui.problems.other : ui.problems[key];
    },
    [agentes, people, ui, locale],
  );

  const run = async (
    who: string,
    url: string,
    init: RequestInit,
    forAgent?: DeskAgent,
  ): Promise<boolean> => {
    setBusy(who);
    setNotice(null);
    const result = await call(url, init);
    if (!alive.current) return false;
    setBusy(null);
    if (result.ok) {
      setSheet({ at: 'ready', view: result.view });
      setNotice({ tone: 'status', text: agentes.saved });
      if (result.token !== null && forAgent !== undefined) {
        setIssued({ agent: { id: forAgent.id, name: forAgent.name }, token: result.token });
      }
      return true;
    }
    setNotice({ tone: 'alert', text: textOf(result.failure) });
    return false;
  };

  const change = (agent: DeskAgent, what: Change): void => {
    void run('patch', '/api/saldo/agents', {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(changeBody(org, agent.id, what)),
    });
  };

  const add = async (draft: Draft): Promise<Failure | null> => {
    const result = await call('/api/saldo/agents', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ accountId: org, ...draft }),
    });
    if (!result.ok) return result.failure;
    setSheet({ at: 'ready', view: result.view });
    setNotice({ tone: 'status', text: agentes.saved });
    setInviting(false);
    if (result.token !== null) {
      setIssued({ agent: { id: draft.id, name: draft.name }, token: result.token });
    }
    return null;
  };

  const view = sheet.at === 'ready' ? sheet.view : null;
  const named: Named = roles ?? view?.assignableRoles ?? [];

  return (
    <div className="agentes" data-agentes={sheet.at === 'failed' ? sheet.failure.kind : sheet.at}>
      <p className="saldo-nota" data-agentes-subtitle>
        {agentes.subtitle}
      </p>
      <p className="agentes-aviso saldo-nota" data-agentes-notice>
        {agentes.notice}
      </p>

      {sheet.at === 'loading' && (
        <div className="saldo-estado" role="status">
          <LunaEspera /> {panelWords.loading}
        </div>
      )}
      {sheet.at === 'failed' && (
        <div
          className="saldo-marco saldo-fallo"
          role="alert"
          data-agentes-failed={sheet.failure.kind}
        >
          <p>{textOf(sheet.failure)}</p>
          {sheet.failure.kind !== 'unavailable' && sheet.failure.kind !== 'signed-out' && (
            <div>
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => setAttempt((n) => n + 1)}
                data-metric="panel-agentes-retry"
              >
                {panelWords.desk.retry}
              </button>
            </div>
          )}
        </div>
      )}

      {view !== null && (
        <section className="saldo-marco agentes-marco" aria-label={agentes.region}>
          {view.agents.length === 0 ? (
            <p className="saldo-nota" data-agentes-none>
              {agentes.none}
            </p>
          ) : (
            <ul className="agentes-lista" data-agentes-list>
              {view.agents.map((agent) => (
                <Row
                  key={agent.id}
                  agent={agent}
                  view={view}
                  named={named}
                  busy={busy !== null}
                  words={agentes}
                  locale={locale}
                  onChange={(what) => change(agent, what)}
                  onRemove={() => run('delete', removeUrl(org, agent.id), { method: 'DELETE' })}
                  onRenew={() =>
                    run(
                      'patch',
                      '/api/saldo/agents',
                      {
                        method: 'PATCH',
                        headers: JSON_HEADERS,
                        body: JSON.stringify(changeBody(org, agent.id, { renewToken: true })),
                      },
                      agent,
                    )
                  }
                  onDisconnect={() =>
                    run('patch', '/api/saldo/agents', {
                      method: 'PATCH',
                      headers: JSON_HEADERS,
                      body: JSON.stringify(changeBody(org, agent.id, { revokeToken: true })),
                    })
                  }
                />
              ))}
            </ul>
          )}
          <div className="agentes-pie">
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => setInviting(true)}
              disabled={!view.mayCreate}
              data-metric="panel-agentes-invite"
            >
              {agentes.invite}
            </button>
            {!view.mayCreate && (
              <span className="saldo-nota" data-agentes-no-right>
                {agentes.noRight}
              </span>
            )}
          </div>
        </section>
      )}

      {notice !== null && (
        <p
          className={notice.tone === 'alert' ? 'fallo' : 'saldo-nota'}
          role={notice.tone === 'alert' ? 'alert' : 'status'}
          data-agentes-notice-line={notice.tone}
        >
          {notice.text}
        </p>
      )}

      <ConnectBlock words={agentes} />

      {inviting && view !== null && (
        <InviteDialog
          world={world}
          words={agentes}
          view={view}
          existing={view.agents}
          failureText={textOf}
          onClose={() => setInviting(false)}
          onAdd={add}
        />
      )}
      {issued !== null && (
        <TokenOnceDialog
          words={agentes}
          org={org}
          agent={issued.agent}
          token={issued.token}
          onDone={() => setIssued(null)}
        />
      )}
    </div>
  );
}

export function PanelAgentes({
  locale,
  words,
  signIn,
  saldoHref,
  ui,
  people,
  agentes,
  world,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  readonly ui: SaldoMessages;
  readonly people: PeopleMessages;
  readonly agentes: AgentesMessages;
  readonly world: WorldAiMessages['dialog'];
}) {
  return (
    <PanelFrame locale={locale} face="agents" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team, panel) => (
        <Agentes
          key={team.id}
          org={team.id}
          locale={locale}
          words={panel.words}
          ui={ui}
          people={people}
          agentes={agentes}
          world={world}
        />
      )}
    </PanelFrame>
  );
}
