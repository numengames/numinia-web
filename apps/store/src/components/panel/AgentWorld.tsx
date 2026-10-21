/**
 * «En el mundo» (S20–S22): the section of an AI's card where its settings for
 * the worlds are set, one group at a time — where it lives (this file's first
 * group), then its body and bubble, then how it is called and what it hears.
 * Every group is a fieldset that is disabled for whoever may not edit the AI
 * (`mayEdit`): they read the values, they cannot move them.
 *
 * Plain words, one short hint under each choice. The section says, always, that
 * these settings reach a world once its engine is updated: the engine's side is
 * not published yet, and the screen does not pretend otherwise.
 *
 * The changes go up as the PATCH bodies of lib/panel-agentes.ts `Change`; the
 * till judges them (each world must be placed in the community) and the card
 * redraws from the list it answers.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { AgentWorlds } from '@numinia/domain';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import { AgentBubble } from './AgentBubble';
import { fill, type DeskAgent } from '../../lib/accounts';
import {
  livesIn,
  toggleWorld,
  worldsForMode,
  worldsModeOf,
  worldsOf,
  type Change,
  type WorldsMode,
} from '../../lib/panel-agentes';

/** The worlds the community has, as the card learns them: loading, not readable, or their ids. */
export type Community =
  | { readonly at: 'loading' }
  | { readonly at: 'failed' }
  | { readonly at: 'ready'; readonly ids: readonly string[] };

const MODES: readonly WorldsMode[] = ['one', 'several', 'all'];

function WhereLives({
  agent,
  editable,
  words,
  community,
  onChange,
}: {
  readonly agent: DeskAgent;
  readonly editable: boolean;
  readonly words: AgentesMessages['world']['where'];
  readonly community: Community;
  readonly onChange: (change: Change) => void;
}) {
  const uid = useId();
  const stored: AgentWorlds = worldsOf(agent);
  const [mode, setMode] = useState<WorldsMode>(() => worldsModeOf(stored));
  const ids = community.at === 'ready' ? community.ids : [];
  const chosen = 'mundos' in stored ? stored.mundos : [];
  const here = livesIn(stored, ids);
  const known = community.at === 'ready';

  const pick = (next: WorldsMode): void => {
    setMode(next);
    const body = worldsForMode(next, stored, ids);
    if (body !== null) onChange({ worlds: body });
  };

  const hint =
    known && ids.length === 0
      ? words.none
      : mode !== 'all' && known && here.length === 0
        ? words.empty
        : words.hints[mode];

  return (
    <fieldset
      className="agentes-grupo"
      disabled={!editable}
      data-agent-where={mode}
      aria-describedby={`${uid}-hint`}
    >
      <legend className="agentes-k">{words.label}</legend>
      <div className="agentes-grupo-cuerpo">
        <div className="agentes-opciones">
          {MODES.map((one) => (
            <label
              key={one}
              className="agentes-opcion agentes-opcion-corta"
              data-agent-where-option={one}
              data-selected={mode === one}
            >
              <input
                type="radio"
                name={`${uid}-donde`}
                value={one}
                checked={mode === one}
                disabled={
                  one === 'all' ? false : !known || ids.length < (one === 'several' ? 2 : 1)
                }
                onChange={() => pick(one)}
                data-metric={`panel-agentes-where-${one}`}
              />
              <span className="agentes-opcion-nombre">{words.modes[one]}</span>
            </label>
          ))}
        </div>

        {mode === 'one' && known && ids.length > 0 && (
          <select
            className="agentes-selector agentes-mundo-uno"
            value={chosen[0] ?? ''}
            aria-label={fill(words.pick, { name: agent.name })}
            disabled={!editable}
            onChange={(event) => onChange({ worlds: { mundos: [event.target.value] } })}
            data-metric="panel-agentes-where-pick"
            data-agent-where-pick
          >
            {!ids.includes(chosen[0] ?? '') && <option value="">…</option>}
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        )}

        {mode === 'several' && known && ids.length > 0 && (
          <ul
            className="agentes-mundos"
            aria-label={fill(words.list, { name: agent.name })}
            data-agent-where-list
          >
            {ids.map((id) => {
              const on = chosen.includes(id);
              return (
                <li key={id}>
                  <label className="agentes-casilla">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={
                        !editable || (on && chosen.filter((one) => ids.includes(one)).length <= 1)
                      }
                      onChange={(event) => {
                        const next = toggleWorld(chosen, id, event.target.checked);
                        if (next !== null) onChange({ worlds: next });
                      }}
                      data-metric="panel-agentes-where-world"
                      data-agent-where-world={id}
                    />
                    <span className="mono">{id}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <p className="saldo-nota agentes-pista" id={`${uid}-hint`} data-agent-where-hint>
          {community.at === 'failed' ? words.unread : hint}
        </p>
      </div>
    </fieldset>
  );
}

export function AgentWorld({
  agent,
  editable,
  words,
  community,
  onChange,
}: {
  readonly agent: DeskAgent;
  /** The asker may change this AI and no write is in flight. */
  readonly editable: boolean;
  readonly words: AgentesMessages;
  readonly community: Community;
  readonly onChange: (change: Change) => void;
}) {
  // While a change is on its way the card disables its controls, and a browser drops the focus of a disabled
  // one: give it back to the control the person was on, so a keyboard keeps its place.
  const last = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (editable && last.current !== null && document.activeElement === document.body) {
      last.current.focus();
    }
  }, [editable]);

  return (
    <div
      className="agentes-mundo"
      data-agent-world-section
      onFocus={(event) => {
        last.current = event.target;
      }}
    >
      <h2 className="agentes-mundo-titulo">{words.world.title}</h2>
      <p className="saldo-nota agentes-mundo-nota" data-agent-world-note>
        {words.world.note}
      </p>
      <WhereLives
        agent={agent}
        editable={editable}
        words={words.world.where}
        community={community}
        onChange={onChange}
      />
      <AgentBubble agent={agent} editable={editable} words={words.world} onChange={onChange} />
    </div>
  );
}
