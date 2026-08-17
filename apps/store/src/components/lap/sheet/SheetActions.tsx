/**
 * Sheet actions bar (MIS-085 D11): edit toggle, the file doors (export .md,
 * print-to-PDF, import) and the one destructive act — wiping this device's
 * copy. Destructive actions warn before acting (Grana + confirmation);
 * import over a non-empty sheet counts as destructive, because it replaces
 * what the device holds.
 */

import { useRef } from 'react';
import type { SheetLabels } from './sheet-props';

interface Props {
  labels: SheetLabels;
  editing: boolean;
  /** True when the current sheet holds anything worth losing. */
  dirty: boolean;
  onToggleEdit: () => void;
  onExport: () => void;
  onImport: (file: File | undefined) => void;
  onWipe: () => void;
}

export function SheetActions({
  labels,
  editing,
  dirty,
  onToggleEdit,
  onExport,
  onImport,
  onWipe,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="acciones">
      <button
        type="button"
        className="btn btn-primario"
        onClick={onToggleEdit}
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
        onClick={() => window.print()}
        data-metric="lap-sheet-export-pdf"
      >
        {labels.exportPdf}
      </button>
      <button
        type="button"
        className="btn btn-fantasma"
        onClick={() => fileInput.current?.click()}
        data-metric="lap-sheet-import"
      >
        {labels.importMd}
      </button>
      <button
        type="button"
        className="btn btn-peligro"
        onClick={() => {
          if (window.confirm(labels.wipeConfirm)) onWipe();
        }}
        data-metric="lap-sheet-wipe"
      >
        {labels.wipe}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".md,text/markdown"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file && dirty && !window.confirm(labels.importConfirm)) return;
          onImport(file);
        }}
      />
    </div>
  );
}
