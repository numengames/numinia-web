/**
 * «La gente»'s small pieces, the same in Miembros and in Roles: a role's dot,
 * a person as the organization sees them — the face and the name they chose
 * to show (optional; lib/panel-people.ts `shownOf` reads them defensively),
 * else a round glyph and the short wallet — the house's strip and the
 * sentences that say what happened (or why not).
 */

import type { SaldoMessages } from '../../i18n/saldo';
import { shortWallet, type DeskMemberDetail } from '../../lib/accounts';
import { shownOf } from '../../lib/panel-people';
import type { PeopleDesk } from './people-desk';
import { PeopleGlyph } from './PeopleGlyph';

/** A role's colour, as a dot beside its name — never as the colour of the text. */
export function RoleDot({ color }: { readonly color: string | null }) {
  return (
    <span
      className="saldo-punto-rol"
      aria-hidden="true"
      style={color === null ? undefined : { background: color }}
    />
  );
}

/** How a person is named in a sentence: the name they chose and their short wallet, or the wallet. */
export function whoOf(member: DeskMemberDetail): string {
  const { name } = shownOf(member);
  const short = shortWallet(member.wallet);
  return name === null ? short : `${name} (${short})`;
}

/** A person: their face (or a round glyph), their name with the short wallet under it, or the wallet. */
export function Person({
  member,
  you,
  ui,
  dot = null,
  size = 32,
}: {
  readonly member: DeskMemberDetail;
  readonly you: string | null;
  readonly ui: SaldoMessages;
  /** The colour of the highest coloured role held, drawn as a dot. */
  readonly dot?: string | null;
  readonly size?: 24 | 32;
}) {
  const { name, face } = shownOf(member);
  const short = shortWallet(member.wallet);
  const mine = you !== null && member.wallet.toLowerCase() === you.toLowerCase();
  return (
    <span className={`gente-persona gente-persona-${size}`}>
      {face === null ? (
        <span className="gente-cara gente-glifo" data-person-glyph>
          <PeopleGlyph name="user" size={size === 32 ? 16 : 14} />
        </span>
      ) : (
        <img
          className="gente-cara"
          src={face}
          alt=""
          loading="lazy"
          width={size}
          height={size}
          data-person-face
        />
      )}
      <span className="gente-quien">
        <span className="gente-linea">
          {name === null ? (
            <span className="mono gente-cartera" data-person-wallet>
              {short}
            </span>
          ) : (
            <span className="gente-nombre" data-person-name>
              {name}
            </span>
          )}
          {mine && <span className="saldo-tu"> ({ui.panel.you})</span>}
          {dot !== null && (
            <span
              className="saldo-punto-rol gente-punto"
              style={{ background: dot }}
              aria-hidden="true"
              data-person-dot
            />
          )}
        </span>
        {name !== null && (
          <span className="mono gente-cartera gente-cartera-pequena" data-person-wallet>
            {short}
          </span>
        )}
      </span>
    </span>
  );
}

/** The crown and «Titular»: an owner is not a role. */
export function OwnerChip({ ui }: { readonly ui: SaldoMessages }) {
  return (
    <span className="saldo-chip gente-titular" data-owner-chip>
      <PeopleGlyph name="crown" size={14} />
      {ui.panel.owner}
    </span>
  );
}

/** While the house enters an organization it is not in (the alpha), it says so. */
export function HouseStrip({ ui }: { readonly ui: SaldoMessages }) {
  return (
    <p className="saldo-marco saldo-casa" data-panel-house>
      {ui.panel.house}
    </p>
  );
}

/** What happened, or why not: read out as it comes. */
export function PeopleNotices({
  desk,
  ui,
}: {
  readonly desk: PeopleDesk;
  readonly ui: SaldoMessages;
}) {
  const { notice, signing } = desk;
  return (
    <div className="gente-avisos" aria-live="polite" data-people-notices>
      {signing && (
        <p className="saldo-nota" role="status" data-panel-signing>
          {ui.panel.signing}
        </p>
      )}
      {notice !== null && (
        <p
          className={notice.tone === 'alert' ? 'saldo-mal gente-aviso' : 'saldo-nota gente-aviso'}
          role={notice.tone === 'alert' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
