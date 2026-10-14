/**
 * The character sheet island (MISSION-008 → MIS-085 D): your character is a
 * FILE you own. D11 (Oracle-signed) adds this-device autosave: edit →
 * localStorage → export/import — the stored copy IS the portable Markdown,
 * one format everywhere. Nothing ever leaves the device. The v0.6.0 rules
 * engine derives what the manual derives and warns where a file disagrees.
 *
 * Layout (Pablo's walkthrough, 2026-10-14: «le hará falta maquetación»): a
 * blank sheet is one door («create your character»), not a wall of «—»; a
 * written one opens with its head — the portrait Resumen keeps in this same
 * record, the name, Prestigio and Prisma — then the identity in three groups
 * and the characteristics as a compact grid of dots.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SHEET_RECORD_KEY, isBlankCitizen } from '../../../lib/citizen-profile';
import {
  emptySheet,
  isBlankSheet,
  sheetFromMarkdown,
  sheetToMarkdown,
  type LapSheet,
} from '../../../lib/lap/sheet';
import { sheetRules } from '../../../lib/lap/rules';
import { rollD6Pool } from '../../../lib/lap/dice';
import type { SheetLabels, SheetLayoutLabels, SheetOptions } from './sheet-props';
import { SheetActions } from './SheetActions';
import { SheetAptitudes } from './SheetAptitudes';
import { SheetGears } from './SheetGears';
import { SheetIdentity } from './SheetIdentity';
import { SheetProfile } from './SheetProfile';
import { SheetStats } from './SheetStats';

interface Props {
  options: SheetOptions;
  labels: SheetLabels;
  layout: SheetLayoutLabels;
}

function storedSheet(): LapSheet {
  try {
    const raw = localStorage.getItem(SHEET_RECORD_KEY);
    if (raw && raw.includes('## ')) return sheetFromMarkdown(raw);
  } catch {
    /* private mode: the sheet just starts empty */
  }
  return emptySheet();
}

export function SheetIsland({ options, labels, layout }: Props) {
  const [sheet, setSheet] = useState<LapSheet>(storedSheet);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const rules = useMemo(() => sheetRules(sheet), [sheet]);
  const blank = isBlankSheet(sheet);

  useEffect(() => {
    try {
      // A record with nothing in it is not kept (Resumen does the same).
      if (blank && isBlankCitizen(sheet.citizen)) localStorage.removeItem(SHEET_RECORD_KEY);
      else localStorage.setItem(SHEET_RECORD_KEY, sheetToMarkdown(sheet));
    } catch {
      /* storage denied: exports still work */
    }
  }, [sheet, blank]);

  const onIdentity = useCallback((key: keyof LapSheet['identity'], value: string) => {
    setSheet((current) => {
      const identity = { ...current.identity, [key]: value };
      // The cascade holds: a new guild resets branch and house; a new branch
      // resets house — a sheet never carries a house from another guild.
      if (key === 'guild') Object.assign(identity, { branch: '', house: '' });
      if (key === 'branch') identity.house = '';
      return { ...current, identity };
    });
  }, []);

  const onNumber = useCallback(
    (group: 'attributes' | 'values' | 'competences', key: string, value: number) => {
      setSheet((current) => {
        const next = { ...current, [group]: { ...current[group], [key]: value } };
        // Aliento del Velo = Percepción (manual 6517): keep the file truthful.
        if (group === 'attributes')
          next.values = { ...next.values, veilBreath: next.attributes.perception };
        return next;
      });
    },
    [],
  );

  const onAptitude = useCallback((index: 0 | 1, patch: Partial<LapSheet['aptitudes'][0]>) => {
    setSheet((current) => {
      const aptitudes: LapSheet['aptitudes'] = [
        { ...current.aptitudes[0] },
        { ...current.aptitudes[1] },
      ];
      Object.assign(aptitudes[index], patch);
      return { ...current, aptitudes };
    });
  }, []);

  const onRoll = useCallback(
    (label: string, pool: number) => {
      const { rolls, total } = rollD6Pool(pool);
      setStatus(`${label} · ${pool}d6 → ${rolls.join(' ')} · ${labels.total} ${total}`);
    },
    [labels.total],
  );

  const onExport = useCallback(() => {
    const blob = new Blob([sheetToMarkdown(sheet)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'numinia-character-sheet.md';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [sheet]);

  const onImport = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      void file.text().then((text) => {
        if (!text.includes('## ')) {
          setStatus(labels.importError);
          return;
        }
        // A file without a card keeps the portrait and profile Resumen holds.
        setSheet((current) => {
          const imported = sheetFromMarkdown(text);
          return isBlankCitizen(imported.citizen)
            ? { ...imported, citizen: current.citizen }
            : imported;
        });
        setStatus('');
      });
    },
    [labels.importError],
  );

  // Wiping the sheet wipes the game, not the face: the portrait and the
  // profile are Resumen's, and stay (they are removed there).
  const onWipe = useCallback(() => {
    setSheet((current) => ({ ...emptySheet(), citizen: current.citizen }));
    setEditing(false);
    setStatus('');
  }, []);

  const statusLine = status && (
    <p className="resultado mono" role="status">
      {status}
    </p>
  );

  if (blank && !editing) {
    return (
      <div data-lap-sheet>
        <section className="ficha-vacia" aria-labelledby="ficha-vacia-titulo">
          <h2 id="ficha-vacia-titulo">{layout.emptyTitle}</h2>
          <p>{layout.emptyBody}</p>
          <SheetActions
            labels={labels}
            editing={false}
            dirty={false}
            startLabel={layout.emptyStart}
            onToggleEdit={() => setEditing(true)}
            onExport={onExport}
            onImport={onImport}
            onWipe={onWipe}
          />
        </section>
        {statusLine}
      </div>
    );
  }

  const attributeRows = (
    [
      'strength',
      'movement',
      'size',
      'constitution',
      'intelligence',
      'wisdom',
      'perception',
      'charisma',
    ] as const
  ).map((key) => ({
    key,
    label: labels.fields[key] ?? key,
    value: sheet.attributes[key],
    chip: rules.position?.bonusAttribute === key ? labels.positionBonus : undefined,
  }));
  const competenceRows = options.competences.map((option) => ({
    key: option.id,
    label: option.label,
    value: sheet.competences[option.id] ?? 0,
    disabled: !rules.enabled.has(option.id as never),
  }));
  const strayPoints = rules.disabledWithPoints
    .map((id) => options.competences.find((option) => option.id === id)?.label ?? id)
    .join(' · ');
  const label = (list: readonly { id: string; label: string }[], id: string): string =>
    list.find((option) => option.id === id)?.label ?? '';
  const subtitle = [
    label(options.species, sheet.identity.species),
    label(options.positions, sheet.identity.position),
    label(options.guilds, sheet.identity.guild),
  ]
    .filter((part) => part !== '')
    .join(' · ');
  const name = sheet.identity.name.trim();
  const photo = sheet.citizen.photo;

  return (
    <div data-lap-sheet>
      <header className="ficha-cabeza">
        <span className="retrato-ficha">
          {photo ? (
            <img src={photo} alt={layout.portraitAlt} width={88} height={88} />
          ) : (
            <span className="monograma" aria-hidden="true">
              {Array.from(name || '?')[0]?.toUpperCase()}
            </span>
          )}
        </span>
        <div className="ficha-quien">
          <p className="ficha-nombre">{name || layout.unnamed}</p>
          {subtitle && <p className="ficha-sub">{subtitle}</p>}
          {!photo && <p className="ficha-pista">{layout.portraitHint}</p>}
        </div>
        {!editing && (
          <div className="kpis">
            {(['prestige', 'prisma'] as const).map((key) => (
              <div className="kpi" key={key}>
                <p className="dato-xl mono">
                  {key === 'prestige' && sheet.values[key] === 0 ? labels.none : sheet.values[key]}
                </p>
                <p className="etiqueta">{labels.fields[key]}</p>
              </div>
            ))}
          </div>
        )}
      </header>
      <SheetActions
        labels={labels}
        editing={editing}
        dirty={!blank}
        onToggleEdit={() => setEditing((value) => !value)}
        onExport={onExport}
        onImport={onImport}
        onWipe={onWipe}
      />
      {statusLine}
      <p className="nota">{labels.fileNote}</p>
      <SheetIdentity
        sheet={sheet}
        options={options}
        labels={labels}
        layout={layout}
        editing={editing}
        onIdentity={onIdentity}
      />
      <SheetGears
        title={labels.attributes}
        rows={attributeRows}
        budget={{
          spent: rules.attributes.spent,
          pool: rules.attributes.pool,
          hint: labels.attributeBounds,
        }}
        disabledTitle=""
        labels={labels}
        editing={editing}
        group="attributes"
        onNumber={onNumber}
        onRoll={onRoll}
      />
      <SheetAptitudes
        sheet={sheet}
        position={rules.position}
        labels={labels}
        editing={editing}
        onAptitude={onAptitude}
      />
      <SheetGears
        title={labels.competences}
        rows={competenceRows}
        budget={{
          spent: rules.competences.spent,
          pool: rules.competences.pool,
          hint: labels.competenceHint,
        }}
        warning={strayPoints ? `${labels.strayPoints} ${strayPoints}` : undefined}
        disabledTitle={labels.disabledCompetence}
        labels={labels}
        editing={editing}
        group="competences"
        onNumber={onNumber}
        onRoll={onRoll}
      />
      <SheetStats
        sheet={sheet}
        rules={rules}
        labels={labels}
        editing={editing}
        onNumber={onNumber}
      />
      <SheetProfile
        sheet={sheet}
        labels={labels}
        editing={editing}
        onText={(key, value) =>
          setSheet((current) => ({ ...current, text: { ...current.text, [key]: value } }))
        }
        onNotes={(value) => setSheet((current) => ({ ...current, notes: value }))}
      />
    </div>
  );
}
