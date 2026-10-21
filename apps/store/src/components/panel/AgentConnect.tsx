/**
 * «Conectar una IA», the one button of the panel's «Agentes», opens this dialog
 * (ConnectDialog): the guide for someone who knows nothing about it. Three
 * screens, one at a time (lib/agentes-guia.ts says which goes where, the
 * words are i18n/agentes-guia.ts):
 *
 * 1. the three ways (an address and the person's account · a code · a key),
 *    each saying for whom, what you will do and what will happen, and the
 *    questions people ask, folded;
 * 2. the AI to connect (Claude, ChatGPT, Hermes, another);
 * 3. three numbered steps for it, with the relay's one address and its
 *    «Copiar», what the person will see next, and — for Hermes — a tab per
 *    place (on the computer: the «Añadir a Hermes» link; in the cloud: its
 *    web panel or a terminal, never its chat).
 *
 * The code and the key stay the invitation's (./AgentInvite.tsx): the step's
 * button closes this dialog and opens it on the one chosen.
 *
 * Static: it asks the server nothing and holds no secret.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import type { GuideList, GuideMessages } from '../../i18n/agentes-guia';
import { fill } from '../../lib/accounts';
import {
  BODIES_AT_ONCE,
  EXPLAIN,
  FAQ_GLYPHS,
  GUIDE_CLIENTS,
  GUIDE_WAYS,
  IDLE_MINUTES,
  backOf,
  extraOf,
  openClient,
  openWay,
  pieces,
  signsIn,
  stepsKeyOf,
  withPlace,
  withWay,
  type GuideClient,
  type GuideView,
  type OtherWay,
  type StepExtra,
} from '../../lib/agentes-guia';
import {
  hermesInstallLink,
  hermesOauthCommand,
  hermesTokenCommand,
  RELAY_URL,
} from '../../lib/panel-agentes';
import { PanelGlyph } from './PanelGlyph';

/** A line with `**bold**` words, drawn with <strong> and no HTML in the messages. */
function Rich({ text }: { readonly text: string }) {
  return (
    <>
      {pieces(text).map((piece, index) =>
        piece.bold ? <strong key={index}>{piece.text}</strong> : piece.text,
      )}
    </>
  );
}

const CLIENT_GLYPH = {
  claude: 'sparkle',
  chatgpt: 'chat-circle-dots',
  hermes: 'lightning',
  other: 'key',
} as const;

const WAY_GLYPH = { address: 'link', code: 'key', key: 'shield-check' } as const;

type Copied = 'url' | 'command' | 'lines' | 'listen' | 'failed' | null;

/** The three ways, then the questions. */
function ExplainView({
  guide,
  onWay,
}: {
  readonly guide: GuideMessages;
  readonly onWay: (way: (typeof GUIDE_WAYS)[number]) => void;
}) {
  const { explain, faq } = guide;
  return (
    <>
      <section
        className="agentes-guia-maneras"
        aria-label={explain.waysLabel}
        data-agentes-guide-ways
      >
        {GUIDE_WAYS.map((way, index) => {
          const card = explain.ways[way];
          const easiest = way === 'address';
          return (
            <article
              key={way}
              className="agentes-guia-manera"
              data-way={way}
              data-agentes-way={way}
              data-recommended={easiest}
            >
              <div className="agentes-guia-banda">
                <span className="agentes-guia-num" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="agentes-guia-burbuja">
                  <PanelGlyph name={WAY_GLYPH[way]} size={24} />
                </span>
              </div>
              <div className="agentes-guia-cuerpo">
                {easiest && <span className="agentes-guia-chip">{explain.easiest}</span>}
                <h3>{card.title}</h3>
                <dl>
                  <div>
                    <dt className="etiqueta">{explain.who}</dt>
                    <dd>{card.who}</dd>
                  </div>
                  <div>
                    <dt className="etiqueta">{explain.does}</dt>
                    <dd>{card.does}</dd>
                  </div>
                  <div>
                    <dt className="etiqueta">{explain.happens}</dt>
                    <dd>{card.happens}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={easiest ? 'btn btn-primario' : 'btn btn-fantasma'}
                  onClick={() => onWay(way)}
                  data-metric={`panel-agentes-guide-way-${way}`}
                  data-agentes-way-go={way}
                >
                  {card.cta}
                  <PanelGlyph name="arrow-right" size={16} />
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section
        className="agentes-guia-faq"
        aria-labelledby="agentes-guia-faq-titulo"
        data-agentes-faq
      >
        <div className="agentes-guia-faq-titulo">
          <PanelGlyph name="question" size={22} />
          <h3 id="agentes-guia-faq-titulo">{faq.title}</h3>
        </div>
        {faq.items.map((item, index) => (
          <details key={FAQ_GLYPHS[index]} data-agentes-faq-item={index + 1}>
            <summary data-metric={`panel-agentes-guide-faq-${index + 1}`}>
              <PanelGlyph name={FAQ_GLYPHS[index] ?? 'question'} size={18} />
              <span>{item.q}</span>
              <span className="agentes-guia-car">
                <PanelGlyph name="caret-down" size={16} />
              </span>
            </summary>
            <p>
              <Rich text={fill(item.a, { n: BODIES_AT_ONCE, minutes: IDLE_MINUTES })} />
            </p>
          </details>
        ))}
        <p className="saldo-nota agentes-guia-pie">
          <PanelGlyph name="info" size={16} />
          <span>{faq.foot}</span>
        </p>
      </section>
    </>
  );
}

/** The tiles: one per AI. */
function ChooseView({
  guide,
  onPick,
}: {
  readonly guide: GuideMessages;
  readonly onPick: (client: GuideClient) => void;
}) {
  return (
    <ul className="agentes-guia-fichas" data-agentes-tiles>
      {GUIDE_CLIENTS.map((client) => {
        const tile = guide.choose.tiles[client];
        return (
          <li key={client}>
            <button
              type="button"
              className="agentes-guia-ficha"
              onClick={() => onPick(client)}
              data-metric={`panel-agentes-guide-pick-${client}`}
              data-agentes-pick={client}
            >
              <span className="agentes-foto" data-client={client}>
                <PanelGlyph name={CLIENT_GLYPH[client]} size={24} />
              </span>
              <span className="agentes-guia-ficha-nombre">{tile.name}</span>
              <span className="agentes-guia-ficha-texto">{tile.text}</span>
              {tile.chip !== undefined && <span className="agentes-guia-chip">{tile.chip}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** A pair of tabs (Hermes' places, another AI's ways): buttons that say which is on. */
function Tabs<T extends string>({
  label,
  options,
  value,
  onChange,
  metric,
}: {
  readonly label: string;
  readonly options: readonly { readonly id: T; readonly text: string }[];
  readonly value: T;
  readonly onChange: (id: T) => void;
  readonly metric: string;
}) {
  return (
    <div className="agentes-guia-pestanas" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="agentes-guia-pestana"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          data-metric={`${metric}-${option.id}`}
          data-agentes-tab={option.id}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}

/** The sample of numinia.com's «Permitir» screen: a drawing, not the page. */
function ConsentPicture({ guide }: { readonly guide: GuideMessages }) {
  const { mock } = guide.steps;
  return (
    <figure className="agentes-guia-muestra" data-agentes-sample>
      <div className="agentes-guia-muestra-dibujo" aria-hidden="true">
        <div className="agentes-guia-muestra-barras">
          <span />
          <span />
          <span />
        </div>
        <div className="agentes-guia-muestra-campo">
          <span>{mock.community}</span>
          <span>{mock.name}</span>
        </div>
        <div className="agentes-guia-muestra-campo">
          <span>{mock.role}</span>
          <span>{mock.none}</span>
        </div>
        <span className="agentes-guia-muestra-boton">{mock.allow}</span>
      </div>
      <figcaption className="saldo-nota">{mock.caption}</figcaption>
    </figure>
  );
}

function StepsView({
  guide,
  access,
  view,
  canInvite,
  copied,
  onCopy,
  onView,
  onInvite,
}: {
  readonly guide: GuideMessages;
  readonly access: AgentesMessages['access'];
  readonly view: Extract<GuideView, { at: 'steps' }>;
  readonly canInvite: boolean;
  readonly copied: Copied;
  readonly onCopy: (what: 'url' | 'command' | 'lines') => void;
  readonly onView: (view: GuideView) => void;
  readonly onInvite: (via: OtherWay) => void;
}) {
  const { steps: words } = guide;
  const key = stepsKeyOf(view);
  const list: GuideList = words.lists[key];

  return (
    <div className="agentes-guia-pasos-marco" data-agentes-steps={key}>
      {view.client === 'hermes' && (
        <Tabs
          label={words.hermes.tabs}
          options={[
            { id: 'computer' as const, text: words.hermes.computer },
            { id: 'cloud' as const, text: words.hermes.cloud },
          ]}
          value={view.place}
          onChange={(place) => onView(withPlace(view, place))}
          metric="panel-agentes-guide-place"
        />
      )}
      {view.client === 'other' && (
        <Tabs
          label={words.other.tabs}
          options={[
            { id: 'code' as const, text: words.other.code },
            { id: 'key' as const, text: words.other.key },
          ]}
          value={view.way}
          onChange={(way) => onView(withWay(view, way))}
          metric="panel-agentes-guide-other"
        />
      )}
      {view.client === 'hermes' && (
        <p className="agentes-guia-aviso" data-agentes-time-warning>
          <PanelGlyph name="hourglass" size={18} />
          <span>
            <Rich text={words.hermes.timeWarn} />
          </span>
        </p>
      )}
      {view.client === 'other' && (
        <p className="agentes-guia-aviso" data-agentes-advanced-warning>
          <PanelGlyph name="warning" size={18} />
          <span>
            <strong>{words.other.warnTitle}.</strong> {words.other.warn}
          </span>
        </p>
      )}

      <div className="agentes-guia-pasos">
        <ol>
          {list.steps.map((step, index) => {
            const extra = extraOf(key, index);
            return (
              <li key={step.title} data-agentes-step={index + 1}>
                <span className="agentes-guia-paso-num" aria-hidden="true">
                  {index + 1}
                </span>
                <div className="agentes-guia-paso-cuerpo">
                  <h3>
                    <span className="agentes-guia-oculto">
                      {fill(words.stepLabel, { n: index + 1 })}:{' '}
                    </span>
                    {step.title}
                  </h3>
                  <p>
                    <Rich text={step.body} />
                  </p>
                  {extra !== null && (
                    <Extra
                      extra={extra}
                      guide={guide}
                      access={access}
                      canInvite={canInvite}
                      copied={copied}
                      onCopy={onCopy}
                      onInvite={onInvite}
                    />
                  )}
                  {step.note !== undefined && (
                    <p className="agentes-guia-nota">
                      <PanelGlyph name="info" size={16} />
                      <span>
                        <Rich text={fill(step.note, { address: RELAY_URL })} />
                      </span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <aside className="agentes-guia-lado">
          <div className="agentes-guia-despues" data-agentes-after>
            <h3 className="etiqueta">{list.after.label}</h3>
            {signsIn(key) && <ConsentPicture guide={guide} />}
            <p>
              <Rich text={list.after.text} />
            </p>
          </div>
          {list.notes.map((note) => (
            <div className="agentes-guia-lado-nota" key={note.text}>
              <PanelGlyph name={note.glyph} size={20} />
              <p>
                <Rich text={note.text} />
              </p>
              {note.action !== undefined && (
                <button
                  type="button"
                  className="btn btn-fantasma"
                  onClick={() => onView(withWay(view, 'key'))}
                  data-metric="panel-agentes-guide-other-key"
                  data-agentes-note-action
                >
                  {note.action}
                </button>
              )}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

/** What goes under a step besides its words. */
function Extra({
  extra,
  guide,
  access,
  canInvite,
  copied,
  onCopy,
  onInvite,
}: {
  readonly extra: StepExtra;
  readonly guide: GuideMessages;
  readonly access: AgentesMessages['access'];
  readonly canInvite: boolean;
  readonly copied: Copied;
  readonly onCopy: (what: 'url' | 'command' | 'lines') => void;
  readonly onInvite: (via: OtherWay) => void;
}): ReactNode {
  const { steps: words } = guide;
  const copy = (what: 'url' | 'command' | 'lines', label: string, metric: string): ReactNode => (
    <button
      type="button"
      className="btn btn-primario"
      onClick={() => onCopy(what)}
      data-metric={metric}
      data-copied={copied === what}
    >
      <PanelGlyph name={copied === what ? 'check' : 'copy'} size={16} />
      {label}
    </button>
  );
  switch (extra) {
    case 'address':
      return (
        <div className="agentes-guia-direccion" role="group" aria-label={words.addressLabel}>
          <code className="agentes-token" data-agentes-relay-url>
            {RELAY_URL}
          </code>
          {copy('url', copied === 'url' ? access.copied : access.copy, 'panel-agentes-url-copy')}
        </div>
      );
    case 'hermes-link':
      return (
        <a
          className="btn btn-primario"
          href={hermesInstallLink()}
          data-agentes-hermes-link
          data-metric="panel-agentes-url-hermes"
        >
          <PanelGlyph name="desktop" size={16} />
          {words.hermes.link}
        </a>
      );
    case 'create-code':
    case 'create-key': {
      const via = extra === 'create-code' ? 'token' : 'key';
      return (
        <button
          type="button"
          className="btn btn-primario"
          disabled={!canInvite}
          onClick={() => onInvite(via === 'token' ? 'code' : 'key')}
          data-metric={`panel-agentes-guide-create-${extra === 'create-code' ? 'code' : 'key'}`}
          data-agentes-advanced
        >
          {extra === 'create-code' ? words.other.createCode : words.other.createKey}
        </button>
      );
    }
    case 'token-command':
      return (
        <div className="agentes-guia-linea">
          <p className="saldo-nota">{words.other.commandHelp}</p>
          <pre className="agentes-conexion">
            <code data-agentes-token-command>{hermesTokenCommand()}</code>
          </pre>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => onCopy('command')}
            data-metric="panel-agentes-url-copy-command"
          >
            <PanelGlyph name={copied === 'command' ? 'check' : 'copy'} size={16} />
            {words.other.copyCommand}
          </button>
        </div>
      );
    case 'terminal':
      return (
        <details className="agentes-guia-terminal" data-agentes-terminal>
          <summary data-metric="panel-agentes-guide-terminal">
            <PanelGlyph name="terminal-window" size={16} />
            {words.hermes.terminal}
          </summary>
          <p className="saldo-nota">{words.hermes.terminalHelp}</p>
          <pre className="agentes-conexion">
            <code data-agentes-terminal-command>{hermesOauthCommand()}</code>
          </pre>
          <button
            type="button"
            className="btn btn-fantasma"
            onClick={() => onCopy('lines')}
            data-metric="panel-agentes-guide-copy-lines"
          >
            <PanelGlyph name={copied === 'lines' ? 'check' : 'copy'} size={16} />
            {words.hermes.copyLines}
          </button>
        </details>
      );
  }
}

/** The dialog the page's one button opens. */
export function ConnectDialog({
  words,
  guide,
  canInvite,
  onClose,
  onInvite,
}: {
  readonly words: AgentesMessages;
  readonly guide: GuideMessages;
  /** Whether the person may make an AI by hand (the code and the key need the right to). */
  readonly canInvite: boolean;
  readonly onClose: () => void;
  /** The step's button: close this and open the invitation on the code (`token`) or on the key. */
  readonly onInvite: (via: 'token' | 'key') => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const [view, setView] = useState<GuideView>(EXPLAIN);
  const [copied, setCopied] = useState<Copied>(null);

  useEffect(() => {
    const element = ref.current;
    if (element && !element.open) element.showModal();
  }, []);

  // A new screen starts at the top, and a screen reader hears its title.
  useEffect(() => {
    setCopied(null);
    if (!moved.current) {
      moved.current = true;
      return;
    }
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    titleRef.current?.focus();
  }, [view]);

  const copy = async (what: 'url' | 'command' | 'lines' | 'listen'): Promise<void> => {
    const text =
      what === 'url'
        ? RELAY_URL
        : what === 'command'
          ? hermesTokenCommand()
          : what === 'listen'
            ? guide.steps.listen.sentence
            : hermesOauthCommand();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied('failed');
    }
  };

  const back = backOf(view);
  const backWords = view.at === 'steps' ? guide.steps.back : guide.choose.back;
  const title =
    view.at === 'explain'
      ? words.connect.button
      : view.at === 'choose'
        ? guide.choose.title
        : guide.steps.lists[stepsKeyOf(view)].title;
  const sub =
    view.at === 'explain'
      ? guide.explain.sub
      : view.at === 'choose'
        ? guide.choose.sub
        : guide.steps.lists[stepsKeyOf(view)].sub;

  return (
    <dialog
      ref={ref}
      className="mundo-ia-dialogo agentes-conectar-dialogo"
      aria-label={words.connect.button}
      onClose={onClose}
      data-agentes-connect-dialog
      data-agentes-view={view.at}
    >
      <div className="mundo-ia-cabeza">
        {back !== null && (
          <button
            type="button"
            className="agentes-guia-volver"
            onClick={() => setView(back)}
            data-metric="panel-agentes-guide-back"
            data-agentes-back
          >
            <PanelGlyph name="caret-left" size={16} />
            {backWords}
          </button>
        )}
        <h2 ref={titleRef} tabIndex={-1}>
          {title}
        </h2>
        <p>{sub}</p>
      </div>
      <div className="mundo-ia-cuerpo" ref={bodyRef}>
        {view.at === 'explain' && (
          <ExplainView guide={guide} onWay={(way) => setView(openWay(way))} />
        )}
        {view.at === 'choose' && (
          <ChooseView guide={guide} onPick={(client) => setView(openClient(client))} />
        )}
        {view.at === 'steps' && (
          <StepsView
            guide={guide}
            access={words.access}
            view={view}
            canInvite={canInvite}
            copied={copied}
            onCopy={(what) => void copy(what)}
            onView={setView}
            onInvite={(way) => {
              ref.current?.close();
              onInvite(way === 'code' ? 'token' : 'key');
            }}
          />
        )}
        {view.at === 'steps' && (
          <div className="agentes-guia-linea agentes-guia-escucha" data-agentes-listen>
            <h3>{guide.steps.listen.title}</h3>
            <p className="saldo-nota">{guide.steps.listen.help}</p>
            <pre className="agentes-conexion">
              <code data-agentes-listen-sentence>{guide.steps.listen.sentence}</code>
            </pre>
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void copy('listen')}
              data-metric="panel-agentes-guide-copy-listen"
            >
              <PanelGlyph name={copied === 'listen' ? 'check' : 'copy'} size={16} />
              {guide.steps.listen.copy}
            </button>
          </div>
        )}
        {copied === 'failed' && (
          <p className="fallo" role="alert" data-agentes-url-copy-failed>
            {words.access.copyFailed}
          </p>
        )}
      </div>
      <div className="mundo-ia-pie">
        <button
          type="button"
          className="btn btn-fantasma"
          onClick={() => ref.current?.close()}
          data-metric="panel-agentes-connect-close"
        >
          {words.connect.close}
        </button>
      </div>
    </dialog>
  );
}
