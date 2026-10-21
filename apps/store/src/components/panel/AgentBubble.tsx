/**
 * «En el mundo», S21 «Cuerpo y burbuja»: the body an AI wears (the house's
 * robot, until the house publishes more), the shape of its bubble (four small
 * drawings), the bubble's radius (2–12 m), when the bubble is drawn, and how
 * long the AI stays in the world when nobody uses it (D-082: off by default,
 * the house pays).
 *
 * Every group is a fieldset disabled for whoever may not edit the AI. A change
 * goes up as a `{ presence: … }` PATCH body (lib/panel-agentes.ts `Change`)
 * carrying only what moved; the till judges it and the card redraws from the
 * list it answers.
 */

import { useEffect, useId, useRef, useState } from 'react';
import type { AgentPresence, BubbleShape } from '@numinia/domain';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import { fill, type DeskAgent } from '../../lib/accounts';
import {
  BUBBLE_FORMS,
  BUBBLE_RADIUS_MAX,
  BUBBLE_RADIUS_MIN,
  BUBBLE_VISIBILITY,
  HOUSE_BODIES,
  STAY_HOURS,
  clampRadius,
  presenceOf,
  type Change,
} from '../../lib/panel-agentes';

/** The four drawings: the bubble seen from the side, in one line, from the text's own colour. */
function Drawing({ shape }: { readonly shape: BubbleShape }) {
  return (
    <svg
      className="agentes-forma-dibujo"
      viewBox="0 0 48 36"
      width="48"
      height="36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {shape === 'esfera' && (
        <>
          <circle cx="24" cy="18" r="14" />
          <ellipse cx="24" cy="18" rx="14" ry="4.5" strokeDasharray="2 3" />
        </>
      )}
      {shape === 'cupula' && (
        <>
          <path d="M6 28 A18 18 0 0 1 42 28" />
          <ellipse cx="24" cy="28" rx="18" ry="4" />
        </>
      )}
      {shape === 'cilindro' && (
        <>
          <ellipse cx="24" cy="8" rx="13" ry="4" />
          <path d="M11 8 V28 M37 8 V28" />
          <path d="M11 28 A13 4 0 0 0 37 28" />
        </>
      )}
      {shape === 'caja' && (
        <>
          <path d="M8 13 L24 6 L40 13 L24 20 Z" />
          <path d="M8 13 V26 L24 33 L40 26 V13" />
          <path d="M24 20 V33" strokeDasharray="2 3" />
        </>
      )}
    </svg>
  );
}

/** The radius: a slider that moves freely and is sent once, when it is let go (or the key is released). */
function Radius({
  radius,
  editable,
  label,
  value,
  hint,
  hintId,
  onCommit,
}: {
  readonly radius: number;
  readonly editable: boolean;
  readonly label: string;
  readonly value: (metres: number) => string;
  readonly hint: string;
  readonly hintId: string;
  readonly onCommit: (metres: number) => void;
}) {
  const [metres, setMetres] = useState(radius);
  const ref = useRef<HTMLInputElement>(null);
  const sent = useRef(radius);
  const latest = useRef(onCommit);
  latest.current = onCommit;

  // What the till answers is the truth: show it when it arrives.
  useEffect(() => {
    setMetres(radius);
    sent.current = radius;
  }, [radius]);

  // The native `change` event fires once, on release; React's `onChange` is the live `input`.
  useEffect(() => {
    const input = ref.current;
    if (input === null) return undefined;
    const release = (): void => {
      const next = clampRadius(Number(input.value));
      if (next !== sent.current) {
        sent.current = next;
        latest.current(next);
      }
    };
    input.addEventListener('change', release);
    return () => input.removeEventListener('change', release);
  }, []);

  return (
    <div className="agentes-radio">
      <label className="agentes-radio-etiqueta" htmlFor={`${hintId}-radio`}>
        <span className="agentes-k">{label}</span>
        <output className="mono agentes-radio-valor" htmlFor={`${hintId}-radio`}>
          {value(metres)}
        </output>
      </label>
      <input
        ref={ref}
        id={`${hintId}-radio`}
        type="range"
        min={BUBBLE_RADIUS_MIN}
        max={BUBBLE_RADIUS_MAX}
        step={1}
        value={metres}
        disabled={!editable}
        aria-describedby={hintId}
        aria-valuetext={value(metres)}
        onChange={(event) => setMetres(clampRadius(Number(event.target.value)))}
        data-metric="panel-agentes-bubble-radius"
        data-agent-bubble-radius
      />
      <p className="saldo-nota agentes-pista" id={hintId}>
        {hint}
      </p>
    </div>
  );
}

export function AgentBubble({
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
  const { bubble, body, stay } = words;

  return (
    <>
      <fieldset
        className="agentes-grupo"
        disabled={!editable}
        data-agent-body
        aria-describedby={`${uid}-cuerpo`}
      >
        <legend className="agentes-k">{body.label}</legend>
        <div className="agentes-grupo-cuerpo">
          <div className="agentes-opciones">
            {HOUSE_BODIES.map((one) => (
              <label
                key={one.modelo}
                className="agentes-opcion agentes-opcion-corta"
                data-selected={now.cuerpo.modelo === one.modelo}
              >
                <input
                  type="radio"
                  name={`${uid}-cuerpo`}
                  checked={now.cuerpo.modelo === one.modelo}
                  onChange={() =>
                    onChange({ presence: { cuerpo: { tipo: 'casa', modelo: one.modelo } } })
                  }
                  data-metric="panel-agentes-body"
                  data-agent-body-model={one.modelo}
                />
                <span className="agentes-opcion-nombre">{body[one.key]}</span>
              </label>
            ))}
          </div>
          <p className="saldo-nota agentes-pista" id={`${uid}-cuerpo`}>
            {body.hint}
          </p>
        </div>
      </fieldset>

      <fieldset
        className="agentes-grupo"
        disabled={!editable}
        data-agent-bubble-shape={now.burbuja.forma}
        aria-describedby={`${uid}-forma`}
      >
        <legend className="agentes-k">{fill(bubble.shapesLabel, { name: agent.name })}</legend>
        <div className="agentes-grupo-cuerpo">
          <div className="agentes-opciones agentes-formas">
            {BUBBLE_FORMS.map((shape) => (
              <label
                key={shape}
                className="agentes-opcion agentes-forma"
                data-selected={now.burbuja.forma === shape}
                data-agent-bubble-form={shape}
              >
                <input
                  type="radio"
                  name={`${uid}-forma`}
                  checked={now.burbuja.forma === shape}
                  onChange={() => onChange({ presence: { burbuja: { forma: shape } } })}
                  data-metric={`panel-agentes-bubble-${shape}`}
                />
                <Drawing shape={shape} />
                <span className="agentes-opcion-nombre">{bubble.shapes[shape].name}</span>
              </label>
            ))}
          </div>
          <p className="saldo-nota agentes-pista" id={`${uid}-forma`}>
            {bubble.shapes[now.burbuja.forma].hint}
          </p>
        </div>
      </fieldset>

      <Radius
        radius={now.burbuja.radio}
        editable={editable}
        label={bubble.radiusLabel}
        value={(metres) => fill(bubble.radiusValue, { n: String(metres) })}
        hint={bubble.radiusHint}
        hintId={`${uid}-radio-pista`}
        onCommit={(metres) => onChange({ presence: { burbuja: { radio: metres } } })}
      />

      <fieldset
        className="agentes-grupo"
        disabled={!editable}
        data-agent-bubble-visible={now.burbuja.visible}
        aria-describedby={`${uid}-visible`}
      >
        <legend className="agentes-k">{bubble.visibleLabel}</legend>
        <div className="agentes-grupo-cuerpo">
          <div className="agentes-opciones">
            {BUBBLE_VISIBILITY.map((one) => (
              <label
                key={one}
                className="agentes-opcion agentes-opcion-corta"
                data-selected={now.burbuja.visible === one}
                data-agent-bubble-visible-option={one}
              >
                <input
                  type="radio"
                  name={`${uid}-visible`}
                  checked={now.burbuja.visible === one}
                  onChange={() => onChange({ presence: { burbuja: { visible: one } } })}
                  data-metric={`panel-agentes-bubble-visible-${one}`}
                />
                <span className="agentes-opcion-nombre">{bubble.visible[one].name}</span>
              </label>
            ))}
          </div>
          <p className="saldo-nota agentes-pista" id={`${uid}-visible`}>
            {bubble.visible[now.burbuja.visible].hint}
          </p>
        </div>
      </fieldset>

      <fieldset
        className="agentes-grupo"
        disabled={!editable}
        data-agent-stay={now.quedarse_h}
        aria-describedby={`${uid}-quedarse`}
      >
        <legend className="agentes-k">{stay.label}</legend>
        <div className="agentes-grupo-cuerpo">
          <div className="agentes-opciones">
            {STAY_HOURS.map((hours) => (
              <label
                key={hours}
                className="agentes-opcion agentes-opcion-corta"
                data-selected={now.quedarse_h === hours}
                data-agent-stay-option={hours}
              >
                <input
                  type="radio"
                  name={`${uid}-quedarse`}
                  checked={now.quedarse_h === hours}
                  onChange={() => onChange({ presence: { quedarse_h: hours } })}
                  data-metric={`panel-agentes-stay-${hours}`}
                />
                <span className="agentes-opcion-nombre">{stay.options[`${hours}`]}</span>
              </label>
            ))}
          </div>
          <p className="saldo-nota agentes-pista" id={`${uid}-quedarse`}>
            {stay.hint}
          </p>
        </div>
      </fieldset>
    </>
  );
}
