/**
 * «Conecta tu IA» in the panel's «Agentes» (paso 2, the URL way): the relay's
 * one address (`https://mcp.numinia.com/mcp`) with «Copiar», a plain line per
 * kind of app — Claude (a custom connector), ChatGPT (an app in developer
 * mode), Hermes desktop (its «Add to Hermes» link, which asks before it adds
 * anything) — each then signing in with numinia.com, and, for clients that
 * cannot sign in, the same address with the token the invitation makes and
 * the Hermes line that asks for it. It also says that an AI connected this way
 * does not hear nearby chat for now.
 *
 * Static: it asks the server nothing and holds no secret. The invitation (the
 * token way) stays the panel's default for adding an AI by hand.
 */

import { useId, useState } from 'react';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import { hermesInstallLink, hermesTokenCommand, RELAY_URL } from '../../lib/panel-agentes';

export function ConnectBlock({ words }: { readonly words: AgentesMessages }) {
  const titleId = useId();
  const [copied, setCopied] = useState<'url' | 'command' | 'failed' | null>(null);
  const { url, access } = words;
  const command = hermesTokenCommand();

  const copy = async (what: 'url' | 'command'): Promise<void> => {
    try {
      await navigator.clipboard.writeText(what === 'url' ? RELAY_URL : command);
      setCopied(what);
    } catch {
      setCopied('failed');
    }
  };

  return (
    <section
      className="saldo-marco agentes-conectar"
      aria-labelledby={titleId}
      data-agentes-connect-url
    >
      <h2 id={titleId} className="agentes-conectar-titulo">
        {url.title}
      </h2>
      <p className="saldo-nota">{url.intro}</p>
      <h3 className="etiqueta">{url.label}</h3>
      <div className="agentes-conectar-linea">
        <code className="agentes-token" data-agentes-relay-url>
          {RELAY_URL}
        </code>
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => void copy('url')}
          data-metric="panel-agentes-url-copy"
        >
          {copied === 'url' ? access.copied : access.copy}
        </button>
      </div>
      <ul className="agentes-conectar-pasos">
        <li data-agentes-step="claude">{url.claude}</li>
        <li data-agentes-step="chatgpt">{url.chatgpt}</li>
        <li data-agentes-step="hermes">
          <span>{url.hermes}</span>
          <a
            className="btn btn-fantasma"
            href={hermesInstallLink()}
            data-agentes-hermes-link
            data-metric="panel-agentes-url-hermes"
          >
            {url.hermesAdd}
          </a>
        </li>
        <li data-agentes-step="token">
          <span>{url.noLogin}</span>
          <div className="agentes-conectar-linea">
            <pre className="agentes-conexion">
              <code data-agentes-token-command>{command}</code>
            </pre>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void copy('command')}
              data-metric="panel-agentes-url-copy-command"
            >
              {copied === 'command' ? access.copied : url.copyCommand}
            </button>
          </div>
        </li>
      </ul>
      <p className="saldo-nota" data-agentes-hear>
        {url.hear}
      </p>
      {copied === 'failed' && (
        <p className="fallo" role="alert" data-agentes-url-copy-failed>
          {access.copyFailed}
        </p>
      )}
    </section>
  );
}
