/**
 * The ⋯ menu of an AI's card in the panel's «Agentes»: only the actions that
 * apply to it (lib/panel-agentes.ts `actionsOf`), each with one line that says
 * what it does, and a closing line that says every one asks before it acts.
 * On a phone it is a sheet from the bottom edge, with a veil behind it; on a
 * wide screen, a popover under the button. It is a plain menu: Down/Up/Home/End
 * move, Escape closes and gives the focus back, leaving it closes it. Choosing
 * an action only closes the menu and says which: the card asks for the
 * confirmation.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { AgentesMessages } from '../../i18n/panel-agentes';
import { fill } from '../../lib/accounts';
import type { AgentAction } from '../../lib/panel-agentes';
import { PanelGlyph } from './PanelGlyph';

const ICONS = {
  disconnect: 'plugs-connected',
  renew: 'arrows-clockwise',
  remove: 'trash',
} as const satisfies Record<AgentAction, string>;

export function AgentMenu({
  name,
  actions,
  labels,
  app,
  busy,
  words,
  onPick,
}: {
  readonly name: string;
  readonly actions: readonly AgentAction[];
  /** Each action's name, as the card says it elsewhere («Desconectar», «Renovar código», «Quitar»). */
  readonly labels: Readonly<Record<AgentAction, string>>;
  /** The app an AI connected from, in the sentence of «Desconectar». */
  readonly app: string;
  readonly busy: boolean;
  readonly words: AgentesMessages;
  readonly onPick: (action: AgentAction) => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const close = (giveFocusBack: boolean): void => {
    setOpen(false);
    if (giveFocusBack) button.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      return;
    }
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const target =
      event.key === 'ArrowDown'
        ? items[(at + 1) % items.length]
        : event.key === 'ArrowUp'
          ? items[(at - 1 + items.length) % items.length]
          : event.key === 'Home'
            ? items[0]
            : event.key === 'End'
              ? items[items.length - 1]
              : undefined;
    if (target !== undefined) {
      event.preventDefault();
      target.focus();
    }
  };

  return (
    <div
      className="agentes-menu-caja"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className="agentes-mas"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${uid}-menu` : undefined}
        aria-label={fill(words.menu.label, { name })}
        data-open={open ? '' : undefined}
        disabled={busy}
        onClick={() => setOpen((now) => !now)}
        data-metric="panel-agentes-menu"
      >
        <PanelGlyph name="dots-three" size={22} />
      </button>
      {open && (
        <>
          <div className="agentes-velo" aria-hidden="true" onClick={() => close(false)} />
          <div
            ref={menu}
            id={`${uid}-menu`}
            className="agentes-menu"
            role="menu"
            aria-label={fill(words.menu.label, { name })}
            onKeyDown={onKeyDown}
            data-agent-menu
          >
            {actions.map((action) => (
              <button
                key={action}
                type="button"
                role="menuitem"
                className="agentes-op"
                data-danger={action === 'remove' ? '' : undefined}
                data-agent-action={action}
                onClick={() => {
                  setOpen(false);
                  onPick(action);
                }}
                data-metric={`panel-agentes-menu-${action}`}
              >
                <PanelGlyph name={ICONS[action]} size={20} />
                <b>{labels[action]}</b>
                <span>{fill(words.menu.hint[action], { app })}</span>
              </button>
            ))}
            <p className="agentes-menu-pie">{words.menu.foot}</p>
          </div>
        </>
      )}
    </div>
  );
}
