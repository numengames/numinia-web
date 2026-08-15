/**
 * What the citizen measures: attributes, values, competences — Mono tabular
 * per §13.11. A stat of N rolls N six-sided dice (the table's rule).
 */

import { ATTRIBUTE_KEYS, VALUE_KEYS, type LapSheet } from '../../../lib/lap/sheet';
import type { SheetLabels, SheetOptions } from './sheet-props';

interface Props {
  sheet: LapSheet;
  options: SheetOptions;
  labels: SheetLabels;
  editing: boolean;
  onNumber: (group: 'attributes' | 'values' | 'competences', key: string, value: number) => void;
  onRoll: (label: string, pool: number) => void;
}

const clamp = (raw: string): number => {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? Math.min(99, Math.max(0, value)) : 0;
};

export function SheetStats({ sheet, options, labels, editing, onNumber, onRoll }: Props) {
  const groups: ReadonlyArray<{
    id: 'attributes' | 'values' | 'competences';
    title: string;
    rows: ReadonlyArray<{ key: string; label: string; value: number; rollable: boolean }>;
  }> = [
    {
      id: 'attributes',
      title: labels.attributes,
      rows: ATTRIBUTE_KEYS.map((key) => ({
        key,
        label: labels.fields[key] ?? key,
        value: sheet.attributes[key],
        rollable: true,
      })),
    },
    {
      id: 'values',
      title: labels.values,
      rows: VALUE_KEYS.map((key) => ({
        key,
        label: labels.fields[key] ?? key,
        value: sheet.values[key],
        rollable: false,
      })),
    },
    {
      id: 'competences',
      title: labels.competences,
      rows: options.competences.map((option) => ({
        key: option.id,
        label: option.label,
        value: sheet.competences[option.id] ?? 0,
        rollable: true,
      })),
    },
  ];

  return (
    <div className="stats">
      {groups.map((group) => (
        <section key={group.id} aria-label={group.title}>
          <h2 className="etiqueta">{group.title}</h2>
          <ul>
            {group.rows.map((row) => (
              <li key={row.key}>
                <span className="stat-label">{row.label}</span>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={row.value}
                    onChange={(event) => onNumber(group.id, row.key, clamp(event.target.value))}
                    data-metric="lap-sheet-stat"
                  />
                ) : (
                  <span className="stat-value mono">
                    {row.value}
                    {row.rollable && row.value > 0 && (
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
      ))}
    </div>
  );
}
