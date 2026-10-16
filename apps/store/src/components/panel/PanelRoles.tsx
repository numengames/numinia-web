/**
 * «Roles» inside the panel: the roles editor of the organization the panel
 * shows (./PeopleRoles.tsx). Its own island, like Miembros, because saving
 * «Administrador» or «Gestionar roles» asks the wallet to sign: this page
 * reaches the wallet's chunks, the Summary and the balance never do.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { PanelMessages } from '../../i18n/panel';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import { PanelFrame } from './PanelFrame';
import { PeopleRoles } from './PeopleRoles';

export function PanelRoles({
  locale,
  words,
  signIn,
  saldoHref,
  ui,
  people,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  readonly ui: SaldoMessages;
  readonly people: PeopleMessages;
}) {
  return (
    <PanelFrame locale={locale} face="roles" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team) => <PeopleRoles key={team.id} org={team.id} locale={locale} ui={ui} words={people} />}
    </PanelFrame>
  );
}
