/**
 * «En el mundo», S22 «Cómo se la llama» and the «Oír» ladder.
 *
 * How it is called: by its name, with `/name`, with the «Hablar con ella» button,
 * with an optional key phrase (1–40 characters), and whether any of that works
 * only from inside its bubble. What it hears is a ladder of three rungs that
 * replaces the old on/off switch: only whoever calls it (the default — what is
 * said to it reaches it even so, D-083), also what is said inside its bubble,
 * everything nearby (the old switch, 20 m). The last rung is the `hears` switch
 * the till keeps in step with it, so the old `hears` request still works.
 *
 * Every group is a fieldset disabled for whoever may not edit the AI. A change
 * goes up as a `{ presence: … }` PATCH body carrying only what moved.
 */

import { useEffect, useId, useState } from 'react';
import type { AgentPresence } from '@numinia/domain';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import { fill, type DeskAgent } from '../../lib/accounts';
import { CALL_PHRASE_MAX, HEARING_STEPS, presenceOf, type Change } from '../../lib/panel-agentes';

type Calling = AgentPresence['llamada'];
type Way = 'nombre' | 'barra' | 'boton' | 'solo_dentro';

const WAYS: readonly { readonly way: Way; readonly key: 'name' | 'bar' | 'button' | 'inside' }[] = [
  { way: 'nombre', key: 'name' },
  { way: 'barra', key: 'bar' },
  { way: 'boton', key: 'button' },
  { way: 'solo_dentro', key: 'inside' },
];

/** The key phrase: a box that is ticked, and a text that is sent when the person is done with it. */
function Phrase({
  agent,
  calling,
  editable,
  words,
  onChange,
}: {
  readonly agent: DeskAgent;
  readonly calling: Calling;
  readonly editable: boolean;
  readonly words: AgentesMessages['world']['call']['phrase'];
  readonly onChange: (change: Change) => void;
}) {
  const uid = useId();
  const stored = calling.frase ?? '';
  const [on, setOn] = useState(calling.frase !== undefined);
  const [text, setText] = useState(stored);
  const [asked, setAsked] = useState(false);

  // What the till answers is the truth.
  useEffect(() => {
    setOn(calling.frase !== undefined);
    setText(calling.frase ?? '');
  }, [calling.frase]);

  const clean = text.trim();
  const fine = clean.length >= 1 && clean.length <= CALL_PHRASE_MAX;

  const send = (): void => {
    setAsked(true);
    if (fine && clean !== stored) onChange({ presence: { llamada: { frase: clean } } });
  };

  return (
    <li className="agentes-llamar-uno" data-agent-call-phrase={on ? 'on' : 'off'}>
      <label className="agentes-casilla agentes-casilla-doble">
        <input
          type="checkbox"
          checked={on}
          disabled={!editable}
          aria-describedby={`${uid}-hint`}
          onChange={(event) => {
            setOn(event.target.checked);
            setAsked(false);
            if (!event.target.checked) {
              setText('');
              if (calling.frase !== undefined) onChange({ presence: { llamada: { frase: null } } });
            }
          }}
          data-metric="panel-agentes-call-phrase"
        />
        <span className="agentes-opcion-cuerpo">
          <span className="agentes-opcion-nombre">{words.label}</span>
          <span className="saldo-nota agentes-pista" id={`${uid}-hint`}>
            {words.hint}
          </span>
        </span>
      </label>
      {on && (
        <div className="agentes-frase">
          <input
            type="text"
            className="agentes-campo"
            value={text}
            maxLength={CALL_PHRASE_MAX}
            disabled={!editable}
            aria-label={fill(words.input, { name: agent.name })}
            aria-invalid={asked && !fine}
            aria-describedby={asked && !fine ? `${uid}-need` : undefined}
            onChange={(event) => setText(event.target.value)}
            onBlur={send}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                send();
              }
            }}
            data-metric="panel-agentes-call-phrase-text"
            data-agent-call-phrase-text
          />
          {asked && !fine && (
            <p
              className="saldo-nota agentes-pista agentes-frase-falta"
              id={`${uid}-need`}
              role="status"
            >
              {words.need}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function AgentCall({
  agent,
  editable,
  words,
  onChange,
}: {
  readonly agent: DeskAgent;
  readonly editable: boolean;
  readonly words: AgentesMessages['world'];
  readonly onChange: (change: Change) => void;
}) {
  const uid = useId();
  const now: AgentPresence = presenceOf(agent);
  const { call, hear } = words;
  const names = { name: agent.name, id: agent.id };

  return (
    <>
      <fieldset
        className="agentes-grupo"
        disabled={!editable}
        data-agent-call
        aria-describedby={`${uid}-inside`}
      >
        <legend className="agentes-k">{call.label}</legend>
        <div className="agentes-grupo-cuerpo">
          <ul className="agentes-llamar">
            {WAYS.filter((one) => one.way !== 'solo_dentro').map(({ way, key }) => (
              <li key={way} className="agentes-llamar-uno">
                <label className="agentes-casilla agentes-casilla-doble">
                  <input
                    type="checkbox"
                    checked={now.llamada[way]}
                    onChange={(event) =>
                      onChange({ presence: { llamada: { [way]: event.target.checked } } })
                    }
                    data-metric={`panel-agentes-call-${way}`}
                    data-agent-call-way={way}
                  />
                  <span className="agentes-opcion-cuerpo">
                    <span className="agentes-opcion-nombre">{fill(call[key].label, names)}</span>
                    <span className="saldo-nota agentes-pista">{fill(call[key].hint, names)}</span>
                  </span>
                </label>
              </li>
            ))}
            <Phrase
              agent={agent}
              calling={now.llamada}
              editable={editable}
              words={call.phrase}
              onChange={onChange}
            />
            <li className="agentes-llamar-uno">
              <label className="agentes-casilla agentes-casilla-doble">
                <input
                  type="checkbox"
                  checked={now.llamada.solo_dentro}
                  aria-describedby={`${uid}-inside`}
                  onChange={(event) =>
                    onChange({ presence: { llamada: { solo_dentro: event.target.checked } } })
                  }
                  data-metric="panel-agentes-call-solo_dentro"
                  data-agent-call-way="solo_dentro"
                />
                <span className="agentes-opcion-cuerpo">
                  <span className="agentes-opcion-nombre">{call.inside.label}</span>
                  <span className="saldo-nota agentes-pista" id={`${uid}-inside`}>
                    {call.inside.hint}
                  </span>
                </span>
              </label>
            </li>
          </ul>
        </div>
      </fieldset>

      <fieldset
        className="agentes-grupo"
        disabled={!editable}
        data-agent-hear={now.oye}
        aria-describedby={`${uid}-oir`}
      >
        <legend className="agentes-k">{hear.label}</legend>
        <div className="agentes-grupo-cuerpo">
          <div className="agentes-opciones agentes-escalera">
            {HEARING_STEPS.map((step) => (
              <label
                key={step}
                className="agentes-opcion"
                data-selected={now.oye === step}
                data-agent-hear-step={step}
              >
                <input
                  type="radio"
                  name={`${uid}-oye`}
                  checked={now.oye === step}
                  onChange={() => onChange({ presence: { oye: step } })}
                  data-metric={`panel-agentes-hear-${step}`}
                />
                <span className="agentes-opcion-cuerpo">
                  <span className="agentes-opcion-nombre">{hear.steps[step].name}</span>
                  <span className="saldo-nota agentes-pista">{hear.steps[step].hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="saldo-nota agentes-pista" id={`${uid}-oir`}>
            {hear.notice}
          </p>
        </div>
      </fieldset>
    </>
  );
}
