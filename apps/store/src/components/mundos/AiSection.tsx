/**
 * The «IA» section of a world's page: the AIs that come into the world,
 * for whoever manages it. It talks to the world's own HTTP door
 * (lib/world-door.ts) from the browser with the owner's world pass, which
 * the page asks numinia.com for (the «Entrar» route) and renews by itself.
 * Under DATA_SOURCE=fixture the door is an in-memory stand-in.
 *
 * Nothing is stored here: the world is the truth, the list is read again
 * every 15 s while the tab is visible.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { WorldAiMessages } from '../../i18n/mundos';
import { fill } from '../../lib/accounts';
import {
  NAME_MAX,
  abilityOf,
  agentIdFrom,
  isAgentKey,
  nameProblem,
  newAgentCommand,
  type Ability,
  type Door,
  type DoorAgent,
  type DoorFailure,
  type DoorResult,
} from '../../lib/world-door';
import { LunaEspera } from '../chrome/LunaEspera';

/** How often the list is read again while the tab is visible. */
const POLL_MS = 15_000;

type Draft = { name: string; ability: Ability; key: string };
const EMPTY_DRAFT: Draft = { name: '', ability: 'talk', key: '' };

/** The failure as one plain sentence, with the world's own words after it where they explain more. */
function failureText(
  words: WorldAiMessages,
  failure: DoorFailure,
  detail: string | null,
): ReactNode {
  const base = words.failures[failure];
  return failure === 'invalid' || failure === 'other' ? (
    <>
      {base}
      {detail === null ? '' : ` ${detail}`}
    </>
  ) : (
    base
  );
}

function InviteDialog({
  words,
  existing,
  onClose,
  onAdd,
}: {
  readonly words: WorldAiMessages;
  readonly existing: readonly DoorAgent[];
  readonly onClose: () => void;
  readonly onAdd: (draft: Draft) => Promise<DoorResult<null>>;
}) {
  const dialog = words.dialog;
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ failure: DoorFailure; detail: string | null } | null>(
    null,
  );

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  const id = agentIdFrom(draft.name);
  const problem = nameProblem(draft.name);
  const taken = problem === null && existing.some((agent) => agent.id === id);
  const nameError =
    problem === null
      ? taken
        ? dialog.nameProblems.taken
        : null
      : fill(dialog.nameProblems[problem], { max: NAME_MAX });
  const keyOk = isAgentKey(draft.key);
  const command = newAgentCommand(id, draft.name);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const add = async (): Promise<void> => {
    setBusy(true);
    setFailed(null);
    const result = await onAdd({ ...draft, name: draft.name.trim() });
    setBusy(false);
    if (!result.ok) setFailed({ failure: result.failure, detail: result.detail });
  };

  return (
    <dialog
      ref={ref}
      className="mundo-ia-dialogo"
      aria-label={dialog.title}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      data-world-ai-dialog={step}
    >
      <div className="mundo-ia-cabeza">
        <h2>{dialog.title}</h2>
        <p className="saldo-nota">{fill(dialog.step, { n: step })}</p>
      </div>
      <div className="mundo-ia-cuerpo">
        {step === 1 && (
          <>
            <label className="mundo-ia-campo">
              <span>{dialog.nameLabel}</span>
              <input
                type="text"
                value={draft.name}
                maxLength={NAME_MAX * 2}
                autoComplete="off"
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                onBlur={() => setTouched(true)}
                aria-invalid={touched && nameError !== null}
                aria-describedby="mundo-ia-nombre-pista"
                data-metric="ai-invite-name"
              />
              <span className="saldo-nota" id="mundo-ia-nombre-pista">
                {touched && nameError !== null ? nameError : dialog.nameHint}
              </span>
            </label>
            <fieldset className="mundo-ia-opciones">
              <legend>{dialog.abilityLabel}</legend>
              {(['talk', 'build'] as const).map((ability) => (
                <label key={ability}>
                  <input
                    type="radio"
                    name="mundo-ia-habilidad"
                    checked={draft.ability === ability}
                    onChange={() => setDraft({ ...draft, ability })}
                    data-metric={`ai-invite-ability-${ability}`}
                  />{' '}
                  {ability === 'talk' ? dialog.abilityTalk : dialog.abilityBuild}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {step === 2 && (
          <>
            <h3 className="etiqueta">{dialog.commandTitle}</h3>
            <p className="saldo-nota">{dialog.commandNote}</p>
            <div className="mundo-ia-linea">
              <code data-world-ai-command>{command}</code>
              <button
                type="button"
                className="btn btn-fantasma"
                onClick={() => void copy()}
                data-metric="ai-invite-copy"
              >
                {copied ? dialog.copied : dialog.copy}
              </button>
            </div>
            <label className="mundo-ia-campo">
              <span>{dialog.keyLabel}</span>
              <input
                type="text"
                className="mono"
                value={draft.key}
                autoComplete="off"
                spellCheck={false}
                placeholder="ed25519:…"
                onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                aria-invalid={draft.key !== '' && !keyOk}
                data-metric="ai-invite-key"
              />
              {draft.key !== '' && !keyOk && (
                <span className="fallo" role="alert">
                  {dialog.keyInvalid}
                </span>
              )}
            </label>
          </>
        )}
        {step === 3 && (
          <dl className="mundo-ia-resumen">
            <dt>{dialog.nameLabel}</dt>
            <dd data-world-ai-summary-name>{draft.name.trim()}</dd>
            <dt>{dialog.abilityLabel}</dt>
            <dd>{draft.ability === 'talk' ? dialog.abilityTalk : dialog.abilityBuild}</dd>
          </dl>
        )}
        {failed !== null && (
          <p className="fallo" role="alert" data-world-ai-failed={failed.failure}>
            {failureText(words, failed.failure, failed.detail)}
          </p>
        )}
      </div>
      <div className="mundo-ia-pie">
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => ref.current?.close()}
          disabled={busy}
          data-metric="ai-invite-cancel"
        >
          {dialog.cancel}
        </button>
        {step > 1 && (
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => {
              setFailed(null);
              setStep(step === 3 ? 2 : 1);
            }}
            disabled={busy}
            data-metric="ai-invite-back"
          >
            {dialog.back}
          </button>
        )}
        {step === 1 && (
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => {
              setTouched(true);
              if (nameError === null) setStep(2);
            }}
            data-metric="ai-invite-next"
          >
            {dialog.next}
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => setStep(3)}
            disabled={!keyOk}
            data-metric="ai-invite-next"
          >
            {dialog.next}
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            className="btn btn-primario"
            onClick={() => void add()}
            disabled={busy}
            aria-busy={busy}
            data-metric="ai-invite-add"
          >
            {busy ? dialog.adding : dialog.add}
          </button>
        )}
      </div>
    </dialog>
  );
}

export function AiSection({
  door,
  words,
  retryLabel,
}: {
  /** The world's door, shared with the other blocks of the page (./use-world-door.ts). */
  readonly door: Door;
  readonly words: WorldAiMessages;
  readonly retryLabel: string;
}) {
  const [agents, setAgents] = useState<readonly DoorAgent[] | null>(null);
  const [failure, setFailure] = useState<DoorFailure | null>(null);
  const [inviting, setInviting] = useState(false);
  const [waiting, setWaiting] = useState<ReadonlySet<string>>(new Set());
  const [asking, setAsking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [rowFailure, setRowFailure] = useState<DoorFailure | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const result = await door.list();
    if (result.ok) {
      setAgents(result.value);
      setFailure(null);
      // Whoever is in no longer waits.
      setWaiting((held) => {
        const still = new Set(
          [...held].filter((id) => result.value.some((a) => a.id === id && !a.present)),
        );
        return still.size === held.size ? held : still;
      });
    } else {
      setFailure(result.failure);
    }
  }, [door]);

  const stopped = failure === 'expired' || failure === 'disabled' || failure === 'no-pass';

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (stopped) return;
    const tick = (): void => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh, stopped]);

  const add = async (draft: Draft): Promise<DoorResult<null>> => {
    const id = agentIdFrom(draft.name);
    const result = await door.add({ id, name: draft.name, key: draft.key, ability: draft.ability });
    if (result.ok) {
      setWaiting((held) => new Set([...held, id]));
      setInviting(false);
      await refresh();
    }
    return result;
  };

  const remove = async (id: string): Promise<void> => {
    setRemoving(id);
    setRowFailure(null);
    const result = await door.remove(id);
    setRemoving(null);
    setAsking(null);
    // A world that no longer has it is as good as removed.
    if (!result.ok && result.failure !== 'not-found') setRowFailure(result.failure);
    await refresh();
  };

  return (
    <section
      className="saldo-marco mundo-ia"
      aria-labelledby="mundo-ia-t"
      data-world-ai={failure ?? (agents === null ? 'loading' : 'ready')}
    >
      <h2 id="mundo-ia-t">{words.title}</h2>
      <p className="saldo-nota">{words.note}</p>
      {agents === null && failure === null && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </p>
      )}
      {failure !== null && (
        <div role="alert" data-world-ai-error={failure}>
          <p className="fallo">{words.failures[failure]}</p>
          {!stopped && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void refresh()}
              data-metric="ai-retry"
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}
      {rowFailure !== null && (
        <p className="fallo" role="alert" data-world-ai-row-failed={rowFailure}>
          {words.failures[rowFailure]}
        </p>
      )}
      {agents !== null && agents.length === 0 && (
        <p className="saldo-nota" data-world-ai-empty>
          {words.empty}
        </p>
      )}
      {agents !== null && agents.length > 0 && (
        <ul className="mundo-ia-lista" aria-label={words.listLabel} data-world-ai-list>
          {agents.map((agent) => {
            const state = agent.present ? 'on' : waiting.has(agent.id) ? 'waiting' : 'off';
            return (
              <li key={agent.id} data-world-ai-agent={agent.id}>
                <span className="mundo-ia-nombre">{agent.name}</span>
                <span className="saldo-nota" data-world-ai-ability>
                  {abilityOf(agent) === 'build' ? words.build : words.talk}
                </span>
                <span className="mundo-ia-presencia saldo-nota" data-presence={state}>
                  <span className="mundo-ia-punto" aria-hidden="true" />
                  {words[state]}
                </span>
                {asking === agent.id ? (
                  <span
                    className="mundo-ia-confirmar"
                    role="group"
                    aria-label={fill(words.removeLabel, { name: agent.name })}
                  >
                    <span className="saldo-nota">
                      {fill(words.removeAsk, { name: agent.name })}
                    </span>
                    <button
                      type="button"
                      className="btn btn-fantasma"
                      onClick={() => void remove(agent.id)}
                      disabled={removing === agent.id}
                      aria-busy={removing === agent.id}
                      data-metric="ai-remove-yes"
                    >
                      {removing === agent.id ? words.removing : words.removeYes}
                    </button>
                    <button
                      type="button"
                      className="btn btn-fantasma"
                      onClick={() => setAsking(null)}
                      disabled={removing === agent.id}
                      data-metric="ai-remove-no"
                    >
                      {words.removeNo}
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-fantasma"
                    onClick={() => setAsking(agent.id)}
                    aria-label={fill(words.removeLabel, { name: agent.name })}
                    data-metric="ai-remove"
                  >
                    {words.remove}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {failure !== 'disabled' && (
        <div>
          <button
            type="button"
            // The hero's «Entrar» is the page's one primary button (cut K): this one is quiet.
            className="btn btn-fantasma"
            onClick={() => setInviting(true)}
            disabled={failure === 'expired'}
            data-metric="ai-invite"
          >
            {words.invite}
          </button>
        </div>
      )}
      {inviting && (
        <InviteDialog
          words={words}
          existing={agents ?? []}
          onClose={() => setInviting(false)}
          onAdd={add}
        />
      )}
    </section>
  );
}
