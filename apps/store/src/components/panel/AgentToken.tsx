/**
 * The screen that shows an AI's access token ONCE, in the panel's «Agentes»:
 * after «Añadir» on a new token AI and after «Renovar token». The secret lives
 * only in this component's props (the page's memory): it is not stored, not put
 * in a URL, not logged, and the dialog cannot be dismissed by accident — Escape
 * is held back, and the only way out is «Ya lo he copiado». It offers the token
 * with «Copiar» and the three lines that connect the AI to Hermes (the very
 * text of lib/panel-agentes.ts `connectCommand`) in a copyable block.
 */

import { useEffect, useRef, useState } from 'react';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import { fill } from '../../lib/accounts';
import { connectCommand } from '../../lib/panel-agentes';

export function TokenOnceDialog({
  words,
  org,
  agent,
  token,
  onDone,
}: {
  readonly words: AgentesMessages;
  readonly org: string;
  readonly agent: { readonly id: string; readonly name: string };
  /** The secret, `ntk_…`. */
  readonly token: string;
  readonly onDone: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState<'token' | 'connect' | 'failed' | null>(null);
  const access = words.access;

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  const command = connectCommand({ origin: window.location.origin, org, id: agent.id, token });

  const copy = async (what: 'token' | 'connect'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(what === 'token' ? token : command);
      setCopied(what);
    } catch {
      setCopied('failed');
    }
  };

  return (
    <dialog
      ref={ref}
      className="mundo-ia-dialogo agentes-token-dialogo"
      aria-label={access.onceTitle}
      // It is shown once: Escape does not close it, «Ya lo he copiado» does.
      onCancel={(event) => event.preventDefault()}
      data-agentes-token-dialog
    >
      <div className="mundo-ia-cabeza">
        <h2>{access.onceTitle}</h2>
        <p className="saldo-nota">{agent.name}</p>
      </div>
      <div className="mundo-ia-cuerpo">
        <p className="saldo-nota">{access.onceNote}</p>
        <h3 className="etiqueta">{access.tokenLabel}</h3>
        <div className="mundo-ia-linea">
          <code className="agentes-token" data-agentes-token>
            {token}
          </code>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void copy('token')}
            data-metric="panel-agentes-token-copy"
          >
            {copied === 'token' ? access.copied : access.copy}
          </button>
        </div>
        <h3 className="etiqueta">{access.connectTitle}</h3>
        <p className="saldo-nota">
          {fill(access.connectNote, { folder: 'numinia-engine', world: 'TU-MUNDO' })}
        </p>
        <div className="mundo-ia-linea">
          <pre className="agentes-conexion">
            <code data-agentes-connect>{command}</code>
          </pre>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => void copy('connect')}
            data-metric="panel-agentes-token-copy-connect"
          >
            {copied === 'connect' ? access.copied : access.copyConnect}
          </button>
        </div>
        {copied === 'failed' && (
          <p className="fallo" role="alert" data-agentes-copy-failed>
            {access.copyFailed}
          </p>
        )}
      </div>
      <div className="mundo-ia-pie">
        <button
          type="button"
          className="btn btn-primario"
          onClick={() => {
            ref.current?.close();
            onDone();
          }}
          data-metric="panel-agentes-token-done"
        >
          {access.done}
        </button>
      </div>
    </dialog>
  );
}
