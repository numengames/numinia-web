/**
 * Free-text tail of the sheet: linguistic profile, equipment lines and the
 * chronicle notes. Free fields stay free — the manual's prose parameters
 * (relic properties, weapon Intervención/Efecto) are the player's words.
 */

import type { LapSheet } from '../../../lib/lap/sheet';
import type { SheetLabels } from './sheet-props';

interface Props {
  sheet: LapSheet;
  labels: SheetLabels;
  editing: boolean;
  onText: (key: keyof LapSheet['text'], value: string) => void;
  onNotes: (value: string) => void;
}

const TEXT_KEYS: ReadonlyArray<keyof LapSheet['text']> = [
  'dialect',
  'sociolect',
  'lingo',
  'idiolect',
  'weapons',
  'relics',
];

export function SheetProfile({ sheet, labels, editing, onText, onNotes }: Props) {
  return (
    <>
      <section aria-label={labels.profile}>
        <h2 className="etiqueta">{labels.profile}</h2>
        <div className="campos">
          {TEXT_KEYS.map((key) => (
            <label key={key}>
              <span>{labels.fields[key]}</span>
              {editing ? (
                <input
                  value={sheet.text[key]}
                  onChange={(event) => onText(key, event.target.value)}
                  data-metric="lap-sheet-field"
                />
              ) : (
                <output>{sheet.text[key] || labels.none}</output>
              )}
            </label>
          ))}
        </div>
      </section>
      <section aria-label={labels.notes}>
        <h2 className="etiqueta">{labels.notes}</h2>
        {editing ? (
          <textarea
            rows={5}
            value={sheet.notes}
            onChange={(event) => onNotes(event.target.value)}
            data-metric="lap-sheet-field"
          />
        ) : (
          <p className="notas">{sheet.notes || labels.none}</p>
        )}
      </section>
    </>
  );
}
