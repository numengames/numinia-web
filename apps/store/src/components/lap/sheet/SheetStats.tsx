/**
 * The sheet's values row (§13.11 Mono tabular): Umbral, Aliento del Velo,
 * Iniciativa, Energía, Prestigio, Prisma. v0.6.0 derivations (MIS-085 D):
 * Aliento del Velo = Percepción (read-only), Umbral and Iniciativa show
 * their position-granted initial value as a hint, and Prestigio stays
 * blank until it exists (manual annex 6699).
 */

import { VALUE_KEYS, type LapSheet } from '../../../lib/lap/sheet';
import type { SheetRules } from '../../../lib/lap/rules';
import type { SheetLabels } from './sheet-props';

interface Props {
  sheet: LapSheet;
  rules: SheetRules;
  labels: SheetLabels;
  editing: boolean;
  onNumber: (group: 'attributes' | 'values' | 'competences', key: string, value: number) => void;
}

const clamp = (raw: string): number => {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? Math.min(99, Math.max(0, value)) : 0;
};

export function SheetStats({ sheet, rules, labels, editing, onNumber }: Props) {
  const initialHint = (key: string): string | undefined => {
    if (!rules.position) return undefined;
    if (key === 'threshold') return `${labels.initialValue} ${rules.position.initialUmbral}`;
    if (key === 'initiative') return `${labels.initialValue} ${rules.position.initiative}`;
    return undefined;
  };

  return (
    <div className="stats">
      <section aria-label={labels.values}>
        <h2 className="etiqueta">{labels.values}</h2>
        <ul>
          {VALUE_KEYS.map((key) => {
            const derived = key === 'veilBreath';
            const value = derived ? rules.veilBreath : sheet.values[key];
            const hint = derived ? labels.fromPerception : initialHint(key);
            const blank = key === 'prestige' && value === 0 && !editing;
            return (
              <li key={key}>
                <span className="stat-label">
                  {labels.fields[key] ?? key}
                  {hint && <em className="chip-regla mono">{hint}</em>}
                </span>
                {editing && !derived ? (
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={value}
                    onChange={(event) => onNumber('values', key, clamp(event.target.value))}
                    data-metric="lap-sheet-stat"
                  />
                ) : (
                  <span className="stat-value mono">{blank ? labels.none : value}</span>
                )}
              </li>
            );
          })}
        </ul>
        {rules.position && (
          <p className="nota-regla">
            {labels.desequilibrium}: {labels.desequilibriumNote}
          </p>
        )}
      </section>
    </div>
  );
}
