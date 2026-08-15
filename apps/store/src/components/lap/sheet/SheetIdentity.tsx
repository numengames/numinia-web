/**
 * Identity block: who this citizen is. Selects hold domain ids (portable);
 * guild → branch → house cascade like the city itself. §9.3 fields.
 */

import type { LapSheet } from '../../../lib/lap/sheet';
import type { SheetLabels, SheetOptions } from './sheet-props';

interface Props {
  sheet: LapSheet;
  options: SheetOptions;
  labels: SheetLabels;
  editing: boolean;
  onIdentity: (key: keyof LapSheet['identity'], value: string) => void;
}

const TEXT_FIELDS: ReadonlyArray<keyof LapSheet['identity']> = ['name', 'player', 'wallet'];

/** §13.11: wallet addresses always Mono and truncated, full value on title. */
const truncate = (address: string): string =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

export function SheetIdentity({ sheet, options, labels, editing, onIdentity }: Props) {
  const guild = options.guilds.find((option) => option.id === sheet.identity.guild);
  const branch = guild?.branches.find((option) => option.id === sheet.identity.branch);

  const selects: ReadonlyArray<
    [keyof LapSheet['identity'], readonly { id: string; label: string }[]]
  > = [
    ['species', options.species],
    ['position', options.positions],
    ['guild', options.guilds],
    ['branch', guild?.branches ?? []],
    ['house', branch?.houses ?? []],
    ['faction', options.factions],
    ['district', options.districts],
    ['archetype', options.archetypes],
    ['humor', options.humors],
  ];

  const labelFor = (key: string, id: string): string =>
    selects.find(([selectKey]) => selectKey === key)?.[1].find((option) => option.id === id)
      ?.label ?? labels.none;

  return (
    <section aria-label={labels.identity}>
      <h2 className="etiqueta">{labels.identity}</h2>
      <div className="campos">
        {TEXT_FIELDS.map((key) => (
          <label key={key}>
            <span>{labels.fields[key]}</span>
            {editing ? (
              <input
                value={sheet.identity[key]}
                onChange={(event) => onIdentity(key, event.target.value)}
                data-metric="lap-sheet-field"
              />
            ) : (
              <output
                className={key === 'wallet' ? 'mono' : ''}
                title={key === 'wallet' ? sheet.identity[key] : undefined}
              >
                {sheet.identity[key]
                  ? key === 'wallet'
                    ? truncate(sheet.identity[key])
                    : sheet.identity[key]
                  : labels.none}
              </output>
            )}
          </label>
        ))}
        {selects.map(([key, list]) => (
          <label key={key}>
            <span>{labels.fields[key]}</span>
            {editing ? (
              <select
                value={sheet.identity[key]}
                onChange={(event) => onIdentity(key, event.target.value)}
                data-metric="lap-sheet-field"
              >
                <option value="">{labels.none}</option>
                {list.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <output>
                {sheet.identity[key] ? labelFor(key, sheet.identity[key]) : labels.none}
              </output>
            )}
          </label>
        ))}
      </div>
    </section>
  );
}
