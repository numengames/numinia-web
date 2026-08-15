/**
 * The character sheet island (MISSION-008): your sheet is a FILE you own.
 * State lives in memory; persistence is export/import of the portable
 * Markdown (File Over App — no accounts, no server, no silent storage,
 * and by constitution no localStorage). D16: open to everyone.
 */

import { useCallback, useRef, useState } from 'react';
import {
  emptySheet,
  sheetFromMarkdown,
  sheetToMarkdown,
  type LapSheet,
} from '../../../lib/lap/sheet';
import { rollD6Pool } from '../../../lib/lap/dice';
import type { SheetLabels, SheetOptions } from './sheet-props';
import { SheetIdentity } from './SheetIdentity';
import { SheetStats } from './SheetStats';

interface Props {
  options: SheetOptions;
  labels: SheetLabels;
}

const TEXT_KEYS: ReadonlyArray<keyof LapSheet['text']> = [
  'dialect',
  'sociolect',
  'lingo',
  'idiolect',
  'weapons',
  'relics',
];

export function SheetIsland({ options, labels }: Props) {
  const [sheet, setSheet] = useState<LapSheet>(emptySheet);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

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
      setSheet((current) => ({ ...current, [group]: { ...current[group], [key]: value } }));
    },
    [],
  );

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
    async (file: File | undefined) => {
      if (!file) return;
      const text = await file.text();
      if (!text.includes('## ')) {
        setStatus(labels.importError);
        return;
      }
      setSheet(sheetFromMarkdown(text));
      setStatus('');
    },
    [labels.importError],
  );

  return (
    <div data-lap-sheet>
      <p className="nota">{labels.fileNote}</p>
      <div className="acciones">
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => setEditing((value) => !value)}
          data-metric="lap-sheet-edit"
        >
          {editing ? labels.done : labels.edit}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={onExport}
          data-metric="lap-sheet-export"
        >
          {labels.exportMd}
        </button>
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => fileInput.current?.click()}
          data-metric="lap-sheet-import"
        >
          {labels.importMd}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".md,text/markdown"
          hidden
          onChange={(event) => void onImport(event.target.files?.[0])}
        />
      </div>
      {status && (
        <p className="resultado mono" role="status">
          {status}
        </p>
      )}
      <SheetIdentity
        sheet={sheet}
        options={options}
        labels={labels}
        editing={editing}
        onIdentity={onIdentity}
      />
      <SheetStats
        sheet={sheet}
        options={options}
        labels={labels}
        editing={editing}
        onNumber={onNumber}
        onRoll={onRoll}
      />
      <section aria-label={labels.profile}>
        <h2 className="etiqueta">{labels.profile}</h2>
        <div className="campos">
          {TEXT_KEYS.map((key) => (
            <label key={key}>
              <span>{labels.fields[key]}</span>
              {editing ? (
                <input
                  value={sheet.text[key]}
                  onChange={(event) =>
                    setSheet((current) => ({
                      ...current,
                      text: { ...current.text, [key]: event.target.value },
                    }))
                  }
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
            onChange={(event) => setSheet((current) => ({ ...current, notes: event.target.value }))}
            data-metric="lap-sheet-field"
          />
        ) : (
          <p className="notas">{sheet.notes || labels.none}</p>
        )}
      </section>
    </div>
  );
}
