/**
 * «Saldo y consumo» inside the panel: the very screen /saldo/ draws for your
 * own account, hosted for the organization the panel shows — its three
 * cards, usage, movements, rules and the way to «Miembros y roles» — with no
 * account switcher of its own (the panel's switcher is the only one) and no
 * way to create an organization from here (Saldo is where one is created).
 */

import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import type { SaldoMessages } from '../../i18n/saldo';
import { SaldoPanel } from '../saldo/SaldoPanel';
import { PanelFrame } from './PanelFrame';

export function PanelSaldo({
  locale,
  words,
  signIn,
  saldoHref,
  ui,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  readonly ui: SaldoMessages;
}) {
  return (
    <PanelFrame locale={locale} face="balance" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team) => (
        <SaldoPanel
          key={team.id}
          ui={ui}
          lang={locale}
          locale={locale}
          signIn={signIn}
          organization={team.id}
        />
      )}
    </PanelFrame>
  );
}
