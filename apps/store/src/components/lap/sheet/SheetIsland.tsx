/**
 * The character sheet island (MISSION-008 → MIS-085 D): your character is a
 * FILE you own. D11 (Oracle-signed) adds this-device autosave: edit →
 * localStorage → export/import — the stored copy IS the portable Markdown,
 * one format everywhere. Nothing ever leaves the device. The v0.6.0 rules
 * engine derives what the manual derives and warns where a file disagrees.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  emptySheet,
  sheetFromMarkdown,
  sheetToMarkdown,
  type LapSheet,
} from '../../../lib/lap/sheet';
import { sheetRules } from '../../../lib/lap/rules';
import { rollD6Pool } from '../../../lib/lap/dice';
import type { SheetLabels, SheetOptions } from './sheet-props';
import { SheetActions } from './SheetActions';
import { SheetAptitudes } from './SheetAptitudes';
import { SheetGears } from './SheetGears';
import { SheetIdentity } from './SheetIdentity';
import { SheetProfile } from './SheetProfile';
import { SheetStats } from './SheetStats';

interface Props {
  options: SheetOptions;
  labels: SheetLabels;
}

/** D11: the character lives on this device (and in exported files). */
const STORAGE_KEY = 'numinia-lap-personaje';

function storedSheet(): LapSheet {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw.includes('## ')) return sheetFromMarkdown(raw);
  } catch {
    /* private mode: the sheet just starts empty */
  }
  return emptySheet();
}

export function SheetIsland({ options, labels }: Props) {
  const [sheet, setSheet] = useState<LapSheet>(storedSheet);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const rules = useMemo(() => sheetRules(sheet), [sheet]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sheetToMarkdown(sheet));
    } catch {
      /* storage denied: exports still work */
    }
  }, [sheet]);

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
        setSheet(sheetFromMarkdown(text));
        setStatus('');
      });
    },
    [labels.importError],
  );

  const onWipe = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing stored, nothing lost */
    }
    setSheet(emptySheet());
    setStatus('');
  }, []);

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

  return (
    <div data-lap-sheet>
      <p className="nota">{labels.fileNote}</p>
      <SheetActions
        labels={labels}
        editing={editing}
        dirty={sheetToMarkdown(sheet) !== sheetToMarkdown(emptySheet())}
        onToggleEdit={() => setEditing((value) => !value)}
        onExport={onExport}
        onImport={onImport}
        onWipe={onWipe}
      />
      {status && (
        <p className="resultado mono" role="status">
          {status}
        </p>
      )}
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
      <SheetIdentity
        sheet={sheet}
        options={options}
        labels={labels}
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
