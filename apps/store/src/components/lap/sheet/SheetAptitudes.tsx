/**
 * Aptitudes Especiales (MIS-085 D, manual ch. 3 fr. 3): two aptitudes
 * chosen from the Posición, named freely here (their prose lives in the
 * Codex), with dice from the affinity pool (0–8, from guild + faction +
 * species + archetype compatibility). An incompatible position is flagged,
 * never silently blocked — the DJ owns the table, not the platform.
 */

import type { LapSheet } from '../../../lib/lap/sheet';
import type { SheetPositionRules } from '../../../lib/lap/rules';
import type { SheetLabels } from './sheet-props';
import { GearRating } from './GearRating';

interface Props {
  sheet: LapSheet;
  position: SheetPositionRules | undefined;
  labels: SheetLabels;
  editing: boolean;
  onAptitude: (index: 0 | 1, patch: Partial<LapSheet['aptitudes'][0]>) => void;
}

export function SheetAptitudes({ sheet, position, labels, editing, onAptitude }: Props) {
  const spent = sheet.aptitudes[0].points + sheet.aptitudes[1].points;
  return (
    <section aria-label={labels.aptitudes}>
      <h2 className="etiqueta">{labels.aptitudes}</h2>
      {position && position.affinity.compatible && (
        <p className="presupuesto mono">
          {spent}/{position.affinity.points} · <span>{labels.aptitudePool}</span>
        </p>
      )}
      {position && !position.affinity.compatible && (
        <p className="aviso-regla">{labels.incompatiblePosition}</p>
      )}
      <ul className="filas-engranaje">
        {([0, 1] as const).map((index) => {
          const aptitude = sheet.aptitudes[index];
          const label = `${labels.aptitudeName} ${index + 1}`;
          return (
            <li key={index}>
              {editing ? (
                <>
                  <input
                    className="apt-nombre"
                    value={aptitude.name}
                    placeholder={label}
                    aria-label={label}
                    onChange={(event) => onAptitude(index, { name: event.target.value })}
                    data-metric="lap-sheet-field"
                  />
                  <GearRating
                    label={label}
                    value={aptitude.points}
                    ofWord={labels.gearOf}
                    metric="lap-sheet-stat"
                    onChange={(points) => onAptitude(index, { points })}
                  />
                </>
              ) : (
                <>
                  <span className="stat-label">{aptitude.name || labels.none}</span>
                  <span className="stat-value mono">{aptitude.points}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
