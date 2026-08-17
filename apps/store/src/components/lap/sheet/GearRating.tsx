/**
 * Gear rating control (MIS-085 D, Khepri EXTENSIÓN §7.5): gears as the
 * sheet's rating iconography, scale 0–5. The gears are presentation —
 * underneath it is a plain radio group, fully keyboard and AA accessible.
 * Set gears turn a quarter (CSS transition; prefers-reduced-motion turns
 * it off in the stylesheet).
 */

import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean | undefined;
  /** aria value text: "3 de 5" — the connective word comes localized. */
  ofWord: string;
  metric: string;
}

const STEPS = [0, 1, 2, 3, 4, 5] as const;

function GearIcon() {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M128 80a48 48 0 1 0 48 48 48.05 48.05 0 0 0-48-48Zm0 80a32 32 0 1 1 32-32 32 32 0 0 1-32 32Zm88-29.84q.06-2.16 0-4.32l14.92-18.64a8 8 0 0 0 1.48-7.06 107.21 107.21 0 0 0-10.88-26.25 8 8 0 0 0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186 40.54a8 8 0 0 0-3.94-6 107.71 107.71 0 0 0-26.25-10.87 8 8 0 0 0-7.06 1.49L130.16 40q-2.16 0-4.32 0L107.2 25.11a8 8 0 0 0-7.06-1.48 107.6 107.6 0 0 0-26.25 10.88 8 8 0 0 0-3.93 6l-2.64 23.76q-1.56 1.49-3 3L40.54 70a8 8 0 0 0-6 3.94 107.71 107.71 0 0 0-10.87 26.25 8 8 0 0 0 1.49 7.06L40 125.84q0 2.16 0 4.32L25.11 148.8a8 8 0 0 0-1.48 7.06 107.21 107.21 0 0 0 10.88 26.25 8 8 0 0 0 6 3.93l23.72 2.64q1.49 1.56 3 3L70 215.46a8 8 0 0 0 3.94 6 107.71 107.71 0 0 0 26.25 10.87 8 8 0 0 0 7.06-1.49L125.84 216q2.16.06 4.32 0l18.64 14.92a8 8 0 0 0 7.06 1.48 107.21 107.21 0 0 0 26.25-10.88 8 8 0 0 0 3.93-6l2.64-23.72q1.56-1.48 3-3L215.46 186a8 8 0 0 0 6-3.94 107.71 107.71 0 0 0 10.87-26.25 8 8 0 0 0-1.49-7.06Zm-16.1-6.5a73.93 73.93 0 0 1 0 8.68 8 8 0 0 0 1.74 5.48l14.19 17.73a91.57 91.57 0 0 1-6.23 15L187 173.11a8 8 0 0 0-5.1 2.64 74.11 74.11 0 0 1-6.14 6.14 8 8 0 0 0-2.64 5.1l-2.51 22.58a91.32 91.32 0 0 1-15 6.23l-17.74-14.19a8 8 0 0 0-5-1.75h-.48a73.93 73.93 0 0 1-8.68 0 8 8 0 0 0-5.48 1.74L100.45 215.8a91.57 91.57 0 0 1-15-6.23L82.89 187a8 8 0 0 0-2.64-5.1 74.11 74.11 0 0 1-6.14-6.14 8 8 0 0 0-5.1-2.64l-22.58-2.52a91.32 91.32 0 0 1-6.23-15l14.19-17.74a8 8 0 0 0 1.74-5.48 73.93 73.93 0 0 1 0-8.68 8 8 0 0 0-1.74-5.48L40.2 100.45a91.57 91.57 0 0 1 6.23-15L69 82.89a8 8 0 0 0 5.1-2.64 74.11 74.11 0 0 1 6.14-6.14A8 8 0 0 0 82.89 69L85.4 46.43a91.32 91.32 0 0 1 15-6.23l17.74 14.19a8 8 0 0 0 5.48 1.74 73.93 73.93 0 0 1 8.68 0 8 8 0 0 0 5.48-1.74L155.55 40.2a91.57 91.57 0 0 1 15 6.23L173.11 69a8 8 0 0 0 2.64 5.1 74.11 74.11 0 0 1 6.14 6.14 8 8 0 0 0 5.1 2.64l22.58 2.51a91.32 91.32 0 0 1 6.23 15l-14.19 17.74a8 8 0 0 0-1.74 5.48Z"
      />
    </svg>
  );
}

export function GearRating({ label, value, onChange, disabled, ofWord, metric }: Props) {
  const name = useId();
  return (
    <span
      className={`engranajes${disabled ? ' vedado' : ''}`}
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
    >
      {STEPS.map((step) => (
        <label
          key={step}
          className={step > 0 && step <= value ? 'diente puesto' : 'diente'}
          title={`${step} ${ofWord} 5`}
        >
          <input
            type="radio"
            name={name}
            value={step}
            checked={value === step}
            disabled={disabled}
            onChange={() => onChange(step)}
            aria-label={`${label}: ${step} ${ofWord} 5`}
            data-metric={metric}
          />
          {step === 0 ? <span className="cero mono">0</span> : <GearIcon />}
        </label>
      ))}
    </span>
  );
}
