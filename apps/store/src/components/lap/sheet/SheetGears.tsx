/**
 * A gear-rated section of the sheet (MIS-085 D): attributes or competences.
 * Editing shows the 0–5 gear radio rows; view shows the value and the dice
 * button. The budget line keeps the creation math honest without policing
 * it — the manual's numbers are shown, the player decides.
 *
 * In view the rows sit in a compact two-column grid and each value is drawn
 * as five dots beside its number (Pablo's walkthrough, 2026-10-14) — the
 * scale is read at a glance, the number stays for the screen reader.
 */

import type { LapSheet } from '../../../lib/lap/sheet';
import type { SheetLabels } from './sheet-props';
import { GearRating } from './GearRating';

interface GearRow {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly disabled?: boolean | undefined;
  /** Small chip next to the label (e.g. «+1 Posición»). */
  readonly chip?: string | undefined;
}

interface Props {
  title: string;
  rows: readonly GearRow[];
  /** Budget: spent/pool plus a literal bounds hint. */
  budget?: { spent: number; pool: number; hint: string } | undefined;
  /** Warning rendered above the rows (e.g. imported disabled points). */
  warning?: string | undefined;
  disabledTitle: string;
  labels: SheetLabels;
  editing: boolean;
  group: keyof Pick<LapSheet, 'attributes' | 'competences'>;
  onNumber: (group: 'attributes' | 'values' | 'competences', key: string, value: number) => void;
  onRoll: (label: string, pool: number) => void;
}

const DOTS = [1, 2, 3, 4, 5] as const;

/** The value as five dots, filled up to it (presentation only). */
function Dots({ value }: { value: number }) {
  return (
    <span className="puntos-escala" aria-hidden="true">
      {DOTS.map((step) => (
        <i key={step} className={step <= value ? 'lleno' : undefined} />
      ))}
    </span>
  );
}

export function SheetGears({
  title,
  rows,
  budget,
  warning,
  disabledTitle,
  labels,
  editing,
  group,
  onNumber,
  onRoll,
}: Props) {
  return (
    <section aria-label={title}>
      <h2 className="etiqueta">{title}</h2>
      {budget && (
        <p className="presupuesto mono">
          {budget.spent}/{budget.pool} · <span>{budget.hint}</span>
        </p>
      )}
      {warning && <p className="aviso-regla">{warning}</p>}
      <ul className={editing ? 'filas-engranaje' : 'filas-engranaje rejilla'}>
        {rows.map((row) => (
          <li key={row.key} title={row.disabled ? disabledTitle : undefined}>
            <span className="stat-label">
              {row.label}
              {row.chip && <em className="chip-regla mono">{row.chip}</em>}
            </span>
            {editing ? (
              <GearRating
                label={row.label}
                value={row.value}
                disabled={row.disabled}
                ofWord={labels.gearOf}
                metric="lap-sheet-stat"
                onChange={(value) => onNumber(group, row.key, value)}
              />
            ) : (
              <span className="stat-value mono">
                {row.disabled ? (
                  labels.none
                ) : (
                  <>
                    <Dots value={row.value} />
                    <span className="cifra">{row.value}</span>
                  </>
                )}
                {!row.disabled && row.value > 0 && (
                  <button
                    type="button"
                    onClick={() => onRoll(row.label, row.value)}
                    aria-label={`${labels.roll} ${row.value}d6 — ${row.label}`}
                    data-metric="lap-dice-roll"
                  >
                    {labels.roll}
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
