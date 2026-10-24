/**
 * The «Funciones de este mundo» block of a world's page (w7): switches for what the world offers —
 * «Normas de entrada» (the engine's `puerta`: Numinia's terms and the community's rules, one door),
 * «Dardos» and «Pesca» — for whoever manages the world. Same door as the «IA» section
 * (lib/world-door.ts, `/funciones`), same world pass.
 *
 * The world is the truth: the block reads it when it opens and every switch asks the world, then shows
 * the state the world answers, never a guess. A function the server fixes shows its switch disabled with
 * «Lo fija el servidor». A world that does not answer the door (an engine from before it) gets one
 * plain line and no switches, and the rest of the page keeps working.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { WorldAiMessages, WorldFunctionsMessages } from '../../i18n/mundos';
import { fill } from '../../lib/accounts';
import {
  FUNCTION_IDS,
  type Door,
  type DoorFunction,
  type FunctionId,
  type FunctionsFailure,
} from '../../lib/world-door';
import { LunaEspera } from '../chrome/LunaEspera';

type Read =
  | { readonly at: 'loading' }
  | { readonly at: 'ready'; readonly list: readonly DoorFunction[] }
  | { readonly at: 'failed'; readonly failure: FunctionsFailure };

interface Notice {
  readonly tone: 'alert' | 'status';
  readonly text: string;
}

function Row({
  one,
  words,
  busy,
  working,
  onSwitch,
}: {
  readonly one: DoorFunction;
  readonly words: WorldFunctionsMessages;
  /** Some switch is being changed: all wait. */
  readonly busy: boolean;
  readonly working: boolean;
  readonly onSwitch: () => void;
}) {
  const uid = useId();
  const nameId = `${uid}-n`;
  const helpId = `${uid}-h`;
  return (
    <li
      className="mundo-fun-fila"
      data-world-function={one.id}
      data-world-function-on={one.active ? 'on' : 'off'}
      data-world-function-fixed={one.fixed ? 'yes' : 'no'}
    >
      <span className="mundo-fun-nombre" id={nameId}>
        {words.names[one.id]}
      </span>
      <span className="mundo-fun-ctrl">
        <button
          type="button"
          role="switch"
          aria-checked={one.active}
          aria-labelledby={nameId}
          aria-describedby={helpId}
          aria-busy={working}
          className="mundo-fun-interruptor"
          disabled={one.fixed || busy}
          onClick={onSwitch}
          data-metric={`world-function-${one.id}`}
        />
        <span className="saldo-nota" data-world-function-state>
          {one.active ? words.on : words.off}
        </span>
      </span>
      <span className="saldo-nota mundo-fun-ayuda" id={helpId}>
        {words.helps[one.id]}
        {one.fixed && (
          <>
            {' '}
            <strong data-world-function-fixed-note>{words.fixed}</strong>
          </>
        )}
      </span>
    </li>
  );
}

export function FunctionsSection({
  door,
  words,
  aiFailures,
  retryLabel,
}: {
  /** The world's door, shared with the other blocks of the page (./use-world-door.ts). */
  readonly door: Door;
  readonly words: WorldFunctionsMessages;
  /** The «IA» section's sentences for the failures every door call shares. */
  readonly aiFailures: WorldAiMessages['failures'];
  readonly retryLabel: string;
}) {
  const [read, setRead] = useState<Read>({ at: 'loading' });
  const [working, setWorking] = useState<FunctionId | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (): Promise<void> => {
    setRead({ at: 'loading' });
    const result = await door.functions();
    if (!alive.current) return;
    setRead(
      result.ok ? { at: 'ready', list: result.value } : { at: 'failed', failure: result.failure },
    );
  }, [door]);

  useEffect(() => {
    void load();
  }, [load]);

  const textOf = (failure: FunctionsFailure, name: string): string => {
    if (failure === 'unsupported') return words.failures.unsupported;
    if (failure === 'fixed') return fill(words.failures.fixed, { name });
    if (failure === 'forbidden') return words.failures.forbidden;
    return aiFailures[failure];
  };

  const change = async (one: DoorFunction): Promise<void> => {
    const name = words.names[one.id];
    setWorking(one.id);
    setNotice(null);
    const result = await door.setFunction(one.id, !one.active);
    if (!alive.current) return;
    setWorking(null);
    if (result.ok) {
      setRead({ at: 'ready', list: result.value });
      const now = result.value.find((entry) => entry.id === one.id);
      setNotice({
        tone: 'status',
        text: fill(now?.active === true ? words.doneOn : words.doneOff, { name }),
      });
      return;
    }
    setNotice({ tone: 'alert', text: textOf(result.failure, name) });
    // A function the server fixes may have been fixed after this block read it: read it again.
    if (result.failure === 'fixed') void load();
  };

  const list =
    read.at === 'ready'
      ? FUNCTION_IDS.flatMap((id) => read.list.filter((entry) => entry.id === id))
      : [];
  const unsupported = read.at === 'failed' && read.failure === 'unsupported';
  const shown = read.at === 'failed' ? (unsupported ? 'unsupported' : 'failed') : read.at;

  return (
    <section
      className="saldo-marco mundo-fun"
      aria-labelledby="mundo-fun-t"
      data-world-functions={shown}
    >
      <h2 id="mundo-fun-t">{words.title}</h2>
      <p className="saldo-nota">{words.note}</p>
      {read.at === 'loading' && (
        <p className="saldo-estado" role="status">
          <LunaEspera /> {words.loading}
        </p>
      )}
      {read.at === 'failed' && (
        <div role={unsupported ? 'status' : 'alert'} data-world-functions-error={read.failure}>
          <p className={unsupported ? 'saldo-nota' : 'fallo'}>{textOf(read.failure, '')}</p>
          {!unsupported && read.failure !== 'expired' && read.failure !== 'no-pass' && (
            <button
              type="button"
              className="btn btn-fantasma"
              onClick={() => void load()}
              data-metric="world-functions-retry"
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}
      {list.length > 0 && (
        <ul className="mundo-fun-lista" data-world-functions-list>
          {list.map((one) => (
            <Row
              key={one.id}
              one={one}
              words={words}
              busy={working !== null}
              working={working === one.id}
              onSwitch={() => void change(one)}
            />
          ))}
        </ul>
      )}
      {notice !== null && (
        <p
          className={notice.tone === 'alert' ? 'fallo' : 'saldo-nota'}
          role={notice.tone === 'alert' ? 'alert' : 'status'}
          data-world-functions-notice={notice.tone}
        >
          {notice.text}
        </p>
      )}
    </section>
  );
}
