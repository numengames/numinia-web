/**
 * Identity block: who this citizen is. Selects hold domain ids (portable);
 * guild → branch → house cascade like the city itself. §9.3 fields.
 *
 * Laid out in three readable groups (Pablo's walkthrough, 2026-10-14: «le
 * hará falta maquetación») — who, where they come from, their place in the
 * city — each a short list of label and value instead of twelve loose cells.
 */

import type { LapSheet } from '../../../lib/lap/sheet';
import type { SheetLabels, SheetLayoutLabels, SheetOptions } from './sheet-props';

type IdentityKey = keyof LapSheet['identity'];

interface Props {
  sheet: LapSheet;
  options: SheetOptions;
  labels: SheetLabels;
  layout: SheetLayoutLabels;
  editing: boolean;
  onIdentity: (key: IdentityKey, value: string) => void;
}

const TEXT_FIELDS: ReadonlySet<IdentityKey> = new Set<IdentityKey>(['name', 'player', 'wallet']);

/** §13.11: wallet addresses always Mono and truncated, full value on title. */
const truncate = (address: string): string =>
  address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;

export function SheetIdentity({ sheet, options, labels, layout, editing, onIdentity }: Props) {
  const guild = options.guilds.find((option) => option.id === sheet.identity.guild);
  const branch = guild?.branches.find((option) => option.id === sheet.identity.branch);

  const lists: Partial<Record<IdentityKey, readonly { id: string; label: string }[]>> = {
    species: options.species,
    position: options.positions,
    guild: options.guilds,
    branch: guild?.branches ?? [],
    house: branch?.houses ?? [],
    faction: options.factions,
    district: options.districts,
    archetype: options.archetypes,
    humor: options.humors,
  };

  const groups: ReadonlyArray<readonly [string, readonly IdentityKey[]]> = [
    [layout.groupWho, ['name', 'player', 'species', 'archetype', 'humor']],
    [layout.groupOrigin, ['position', 'guild', 'branch', 'house']],
    [layout.groupCity, ['faction', 'district', 'wallet']],
  ];

  const shown = (key: IdentityKey): string => {
    const value = sheet.identity[key];
    if (!value) return labels.none;
    if (key === 'wallet') return truncate(value);
    if (TEXT_FIELDS.has(key)) return value;
    return lists[key]?.find((option) => option.id === value)?.label ?? labels.none;
  };

  const control = (key: IdentityKey) =>
    TEXT_FIELDS.has(key) ? (
      <input
        value={sheet.identity[key]}
        onChange={(event) => onIdentity(key, event.target.value)}
        data-metric="lap-sheet-field"
      />
    ) : (
      <select
        value={sheet.identity[key]}
        onChange={(event) => onIdentity(key, event.target.value)}
        data-metric="lap-sheet-field"
      >
        <option value="">{labels.none}</option>
        {(lists[key] ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );

  return (
    <section aria-label={labels.identity}>
      <h2 className="etiqueta">{labels.identity}</h2>
      <div className="grupos-identidad">
        {groups.map(([title, keys]) => (
          <div className="grupo-identidad" key={title}>
            <h3>{title}</h3>
            {editing ? (
              <div className="campos">
                {keys.map((key) => (
                  <label key={key}>
                    <span>{labels.fields[key]}</span>
                    {control(key)}
                  </label>
                ))}
              </div>
            ) : (
              <dl>
                {keys.map((key) => (
                  <div key={key} className={sheet.identity[key] ? '' : 'vacio'}>
                    <dt>{labels.fields[key]}</dt>
                    <dd
                      className={key === 'wallet' ? 'mono' : undefined}
                      title={key === 'wallet' ? sheet.identity[key] : undefined}
                    >
                      {shown(key)}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
