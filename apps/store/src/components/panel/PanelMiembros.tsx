/**
 * «Miembros y roles» inside the panel: the screen that already exists (a tab
 * of Saldo until now), hosted for the organization the panel shows, with no
 * second picker. It lives in its own island, apart from the Summary and the
 * balance, because it is the one that can ask the wallet to sign (giving
 * «Administrador»): only this page reaches the wallet's chunks.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import type { SaldoMessages } from '../../i18n/saldo';
import { MiembrosPanel } from '../saldo/MiembrosPanel';
import { PanelFrame } from './PanelFrame';

export function PanelMiembros({
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
    <PanelFrame locale={locale} face="members" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team) => (
        <MiembrosPanel
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
