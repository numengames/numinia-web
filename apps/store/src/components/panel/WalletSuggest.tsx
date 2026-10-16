/**
 * «Añadir miembro»'s wallet field (cut «El censo», 2026-10-16). For anyone
 * but the house it is the plain field it always was: a wallet typed by
 * hand, and not one request more. For the house — an Oracle's session, as
 * the chrome read it — it is an ARIA combobox: as two or more characters are
 * typed it suggests people who have signed in (by name or wallet, from
 * /api/admin/citizens through lib/census-list.ts), walked with the arrows,
 * picked with Enter or a click, which fills in the wallet. Typing a whole
 * wallet still works, and then nothing is suggested.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import { CENSUS_LIST_UI } from '../../i18n/census-list';
import { fill, type Citizen } from '../../lib/accounts';
import { isHouseSession, listboxStep, personLines, suggestCitizens } from '../../lib/census-list';
import { pageSessionClient } from '../../lib/island-session';

/** Typing settles for this long before the house's list is asked. */
const PAUSE_MS = 200;

const LISTBOX = 'gente-cartera-sugerencias';
const optionId = (index: number): string => `${LISTBOX}-${index}`;

export function WalletSuggest({
  locale,
  value,
  bad,
  onChange,
}: {
  readonly locale: SupportedLocale;
  readonly value: string;
  readonly bad: boolean;
  readonly onChange: (value: string) => void;
}) {
  const words = CENSUS_LIST_UI[locale].suggest;
  const [house, setHouse] = useState(false);
  const [people, setPeople] = useState<readonly Citizen[]>([]);
  const [active, setActive] = useState(-1);
  const [shut, setShut] = useState(false);
  const asked = useRef(0);

  // The house is the session's Oracle rank: for anyone else this stays false and nothing is asked.
  useEffect(() => {
    let live = true;
    void pageSessionClient(window)
      .then((client) => client.current())
      .then((view) => {
        if (live) setHouse(isHouseSession(view));
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!house) return undefined;
    const mine = ++asked.current;
    const timer = setTimeout(() => {
      void suggestCitizens(true, value, fetch).then((found) => {
        if (mine !== asked.current) return;
        setPeople(found);
        setActive(-1);
      });
    }, PAUSE_MS);
    return () => clearTimeout(timer);
  }, [house, value]);

  const expanded = house && !shut && people.length > 0;

  const pick = (person: Citizen): void => {
    onChange(person.wallet);
    setPeople([]);
    setActive(-1);
  };

  const keys = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (!expanded) return;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      setActive(listboxStep(active, people.length, event.key));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      const person = people[active];
      if (person !== undefined) pick(person);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setShut(true);
    }
  };

  const common = {
    id: 'gente-cartera',
    className: 'mono',
    value,
    autoComplete: 'off',
    spellCheck: false,
    maxLength: 64,
    'aria-invalid': bad,
    'aria-describedby': bad ? 'gente-cartera-mal' : undefined,
    'data-metric': 'panel-member-add-wallet',
  } as const;

  if (!house) {
    return <input {...common} onChange={(event) => onChange(event.target.value)} />;
  }

  return (
    <span className="gente-sugerir">
      <input
        {...common}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={LISTBOX}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        onChange={(event) => {
          setShut(false);
          onChange(event.target.value);
        }}
        onKeyDown={keys}
        onBlur={() => setShut(true)}
        onFocus={() => setShut(false)}
      />
      {expanded && (
        <ul id={LISTBOX} role="listbox" aria-label={words.label} className="gente-sugerencias">
          {people.map((person, index) => {
            const lines = personLines(person);
            return (
              <li
                key={person.wallet}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // Chosen before the field's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(person);
                }}
                data-metric="panel-member-add-suggestion"
              >
                {person.face === null ? null : (
                  <img src={person.face} alt="" width={24} height={24} className="gente-cara" />
                )}
                <span>{lines.title}</span>
                {lines.sub !== null && <span className="mono gente-tenue">{lines.sub}</span>}
              </li>
            );
          })}
        </ul>
      )}
      <span className="sr-only" aria-live="polite">
        {expanded ? fill(words.found, { n: String(people.length) }) : ''}
      </span>
    </span>
  );
}
