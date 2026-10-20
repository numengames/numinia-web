/**
 * «Agentes» inside the panel: the AIs the community's people have brought, one
 * compact card each — a round with the app's glyph, the name, a chip that says
 * where it came from («Desde Claude», «Desde el panel (con código)», «Con
 * clave»: lib/panel-agentes.ts `clientOf`, from `via`), the Encendida switch and
 * a ⋯ menu (./AgentMenu.tsx) with only what applies to it — «Desconectar»,
 * «Renovar código», «Quitar» — each asking before it acts. Under the card's
 * line: ESTADO (Activa / Dormida), OÍR (the nearby chat), the roles as chips
 * with the give-role select, and who answers for it. An AI made with a code
 * also shows the code's start and day; the new secret, like the first, is shown
 * once (./AgentToken.tsx).
 *
 * The page has ONE button, «Conectar una IA», beside the title (a portal into
 * PanelFrame's header): it opens the connect dialog (./AgentConnect.tsx), whose
 * small «Con un token o una clave (avanzado)» opens the invitation
 * (./AgentInvite.tsx). With no AIs, the empty state says one line and has that
 * same button. It talks to /api/saldo/agents (lib/agents-source.ts), which
 * answers the whole list after every write, so the screen never guesses what
 * changed.
 *
 * The till decides on every write: the controls the person cannot use are
 * disabled or left out (`mayEdit`, `assignable`), and when the till refuses
 * anyway the refusal is told in a sentence, never as a code. The roles'
 * names come from GET /api/saldo/roles (the same answer Miembros reads);
 * where that fails, the ones the person may assign are still named.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ORGANIZATION_PERMISSION_LABELS, type SupportedLocale } from '@numinia/domain';
import type { WorldAiMessages } from '../../i18n/mundos';
import type { PanelMessages } from '../../i18n/panel';
import { PIECES, pieceHref } from '../../lib/panel';
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
  actionsOf,
  appNameOf,
  changeBody,
  chipsOf,
  clientOf,
  connectionOf,
  failureOf,
  listUrl,
  readAgents,
  readToken,
  refusalOf,
  removeUrl,
  responsibleOf,
  rolesToGive,
  tokenLine,
  type AgentAction,
  type AgentClient,
  type Change,
  type Failure,
} from '../../lib/panel-agentes';
import { LunaEspera } from '../chrome/LunaEspera';
import { ConnectDialog } from './AgentConnect';
import { AgentMenu } from './AgentMenu';
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

/** The glyph in the round of a card, by the app the AI came from. */
const CLIENT_GLYPH = {
  claude: 'sparkle',
  chatgpt: 'chat-circle-dots',
  hermes: 'lightning',
  panel: 'key',
  key: 'key',
  other: 'robot',
} as const satisfies Record<AgentClient['kind'], string>;

/** What a pending confirmation of the ⋯ menu says, and the call that carries it out. */
type Asking = AgentAction | null;

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
  const client = clientOf(agent);
  const app = appNameOf(client);
  const connection = connectionOf(agent);
  const host = connection?.kind === 'url' ? connection.host : null;
  const line = tokenLine(agent);
  const actions = actionsOf(agent);
  const [asking, setAsking] = useState<Asking>(null);
  const [working, setWorking] = useState(false);
  const chips = chipsOf(agent, named);
  const options = rolesToGive(agent, view);
  const editable = agent.mayEdit && !busy;
  const nameId = `${uid}-n`;
  const onoffId = `${uid}-o`;
  const hearId = `${uid}-h`;
  const chipText = fill(words.client[client.kind], { host: app ?? '' });
  const labels: Record<AgentAction, string> = {
    disconnect: words.connection.disconnect,
    renew: words.access.renew,
    remove: words.remove,
  };
  const say = {
    disconnect: {
      label: words.connection.disconnectLabel,
      ask: words.connection.disconnectAsk,
      yes: words.connection.disconnectYes,
      doing: words.connection.disconnecting,
      no: words.connection.disconnectNo,
      run: onDisconnect,
    },
    renew: {
      label: words.access.renewLabel,
      ask: words.access.renewAsk,
      yes: words.access.renewYes,
      doing: words.access.renewing,
      no: words.access.renewNo,
      run: onRenew,
    },
    remove: {
      label: words.removeLabel,
      ask: words.removeAsk,
      yes: words.removeYes,
      doing: words.removing,
      no: words.removeNo,
      run: onRemove,
    },
  } as const;

  return (
    <li
      className="agentes-fila"
      data-agent={agent.id}
      data-agent-status={agent.status}
      data-agent-client={client.kind}
      data-agent-on={agent.enabled ? 'on' : 'off'}
    >
      <div className="agentes-foto" data-client={client.kind} aria-hidden="true">
        <PanelGlyph name={CLIENT_GLYPH[client.kind]} size={24} />
      </div>
      <div className="agentes-id">
        <span className="agentes-nombre" id={nameId}>
          {agent.name}
        </span>
        <p className="agentes-origen">
          <span
            className="agentes-de"
            data-agent-via={client.kind}
            data-agent-via-kind={connection?.kind}
          >
            <PanelGlyph name={CLIENT_GLYPH[client.kind]} size={14} />
            {chipText}
          </span>
          <span data-agent-status-line>{words.status[agent.status]}</span>
        </p>
      </div>
      <div className="agentes-ctrl">
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
        {actions.length > 0 && (
          <AgentMenu
            name={agent.name}
            actions={actions}
            labels={labels}
            app={app ?? ''}
            busy={busy}
            words={words}
            onPick={setAsking}
          />
        )}
      </div>

      {asking !== null && (
        <div
          className="mundo-ia-confirmar agentes-confirmar"
          role="group"
          aria-label={fill(say[asking].label, { name: agent.name })}
          data-agent-confirm={asking}
        >
          <span className="saldo-nota">
            {fill(say[asking].ask, { name: agent.name, host: host ?? '' })}
          </span>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={working}
            aria-busy={working}
            onClick={() => {
              setWorking(true);
              void say[asking].run().then(() => {
                setWorking(false);
                setAsking(null);
              });
            }}
            data-metric={`panel-agentes-${asking}-yes`}
          >
            {working ? say[asking].doing : say[asking].yes}
          </button>
          <button
            type="button"
            className="btn btn-fantasma"
            disabled={working}
            onClick={() => setAsking(null)}
            data-metric={`panel-agentes-${asking}-no`}
          >
            {say[asking].no}
          </button>
        </div>
      )}

      <div className="agentes-detalle">
        <fieldset
          className="agentes-fila-estado"
          disabled={!editable}
          data-agent-state={agent.state}
        >
          <legend className="agentes-k">{words.stateLabel}</legend>
          <div className="agentes-seg">
            {(['activa', 'dormida'] as const satisfies readonly AgentState[]).map((state) => (
              <label
                key={state}
                className="agentes-opcion agentes-seg-op"
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
                {state === 'activa' ? (
                  <span className="agentes-punto" aria-hidden="true" data-agent-dot />
                ) : (
                  <span className="agentes-luna" aria-hidden="true" data-agent-moon>
                    <PanelGlyph name="moon" size={14} />
                  </span>
                )}
                {words.states[state].name}
              </label>
            ))}
          </div>
          <span className="saldo-nota agentes-pista" data-agent-state-hint>
            {words.states[agent.state].hint}
          </span>
        </fieldset>

        <div className="agentes-fila-oir" data-agent-hear={agent.hears ? 'on' : 'off'}>
          <span className="agentes-k" id={`${hearId}-k`}>
            {words.hearRow}
          </span>
          <span className="agentes-oir">
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
                {agent.hears ? words.hearOn : words.hearHint}
              </span>
            </span>
          </span>
        </div>

        <div className="agentes-roles">
          <p className="agentes-k">{words.roles}</p>
          <div className="agentes-roles-cuerpo">
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
        </div>

        <p className="saldo-nota agentes-linea" data-agent-responsible>
          {fill(words.responsible, { name: responsibleOf(agent) })}
        </p>
        {host !== null && agent.auth === 'token' && line === null && (
          <p className="saldo-nota agentes-linea" data-agent-url-none>
            {fill(words.connection.urlNone, { host })}
          </p>
        )}
        {agent.auth === 'token' && host === null && (
          <p className="saldo-nota agentes-linea agentes-token-linea" data-agent-token-line>
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
        {!agent.mayEdit && (
          <p className="saldo-nota agentes-linea" data-agent-read-only>
            {words.readOnly}
          </p>
        )}
      </div>
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
  titleSlot,
}: {
  readonly org: string;
  readonly locale: SupportedLocale;
  readonly titleSlot: HTMLElement | null;
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
  const [connecting, setConnecting] = useState(false);
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

  const settings = PIECES.find((piece) => piece.id === 'settings');
  const settingsHref = settings === undefined ? null : pieceHref(locale, settings, org);
  const connectButton = (
    <button
      type="button"
      className="btn btn-primario agentes-conectar-boton"
      onClick={() => setConnecting(true)}
      disabled={view === null || !view.mayCreate}
      data-metric="panel-agentes-connect"
      data-agentes-connect
    >
      <PanelGlyph name="plus" size={18} />
      {agentes.connect.button}
    </button>
  );

  return (
    <div className="agentes" data-agentes={sheet.at === 'failed' ? sheet.failure.kind : sheet.at}>
      {titleSlot !== null && view !== null && createPortal(connectButton, titleSlot)}
      {view !== null && !view.mayCreate && (
        <p className="saldo-nota" data-agentes-no-right>
          {agentes.noRight}
        </p>
      )}
      <p className="agentes-pista-info saldo-nota" data-agentes-subtitle>
        <PanelGlyph name="info" size={16} />
        <span>
          {agentes.assistant.before}
          {settingsHref === null ? (
            agentes.assistant.link
          ) : (
            <a href={settingsHref} data-agentes-settings-link>
              {agentes.assistant.link}
            </a>
          )}
          {agentes.assistant.after}
        </span>
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

      {view !== null && view.agents.length === 0 && (
        <section className="agentes-vacio" aria-label={agentes.region} data-agentes-none>
          <svg
            className="agentes-vacio-ilu"
            viewBox="0 0 240 120"
            role="img"
            aria-label={agentes.empty.art}
          >
            <path
              d="M20 92 H78 M162 92 H220"
              stroke="var(--linea-f)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <rect
              x="78"
              y="70"
              width="84"
              height="44"
              rx="8"
              fill="var(--superficie)"
              stroke="var(--linea-f)"
              strokeWidth="2"
            />
            <circle cx="120" cy="58" r="22" fill="var(--turquesa)" opacity="0.2" />
            <circle cx="120" cy="58" r="12" fill="var(--turquesa)" />
            <circle cx="115" cy="56" r="2" fill="#fff" />
            <circle cx="125" cy="56" r="2" fill="#fff" />
            <path
              d="M86 92 H154"
              stroke="var(--turquesa)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="2 8"
              fill="none"
            />
          </svg>
          <h2 className="agentes-vacio-titulo">{agentes.empty.title}</h2>
          <p>{agentes.empty.text}</p>
          {titleSlot === null && connectButton}
          <p className="saldo-nota">{agentes.empty.foot}</p>
        </section>
      )}
      {view !== null && view.agents.length > 0 && (
        <ul className="agentes-lista" data-agentes-list aria-label={agentes.region}>
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

      {notice !== null && (
        <p
          className={notice.tone === 'alert' ? 'fallo' : 'saldo-nota'}
          role={notice.tone === 'alert' ? 'alert' : 'status'}
          data-agentes-notice-line={notice.tone}
        >
          {notice.text}
        </p>
      )}

      <p className="agentes-aviso saldo-nota" data-agentes-notice>
        {agentes.notice}
      </p>

      {connecting && view !== null && (
        <ConnectDialog
          words={agentes}
          canInvite={view.mayCreate}
          onClose={() => setConnecting(false)}
          onAdvanced={() => setInviting(true)}
        />
      )}
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
          titleSlot={panel.titleSlot}
        />
      )}
    </PanelFrame>
  );
}
