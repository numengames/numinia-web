/**
 * «Miembros» inside the panel: the people of the organization the panel
 * shows (./PeopleMembers.tsx), with no picker of its own. It lives in its own
 * island, apart from the Summary and the balance, because it is one of the
 * two that can ask the wallet to sign (giving «Administrador»): only this
 * page and Roles reach the wallet's chunks.
 */

import type { SupportedLocale } from '@numinia/domain';
import type { CommunityRequestsMessages } from '../../i18n/community-requests';
import type { PanelMessages } from '../../i18n/panel';
import type { PeopleMessages } from '../../i18n/panel-people';
import type { SaldoMessages } from '../../i18n/saldo';
import { PanelFrame } from './PanelFrame';
import { PeopleMembers } from './PeopleMembers';

export function PanelMiembros({
  locale,
  words,
  signIn,
  saldoHref,
  homeHref,
  ui,
  people,
  communities,
  requests,
}: {
  readonly locale: SupportedLocale;
  readonly words: PanelMessages;
  readonly signIn: string;
  readonly saldoHref: string;
  /** The panel's door, where leaving an organization lands. */
  readonly homeHref: string;
  readonly ui: SaldoMessages;
  readonly people: PeopleMessages;
  /** The community of each organization the register names, by the organization's account id. */
  readonly communities: Readonly<Record<string, string>>;
  readonly requests: CommunityRequestsMessages['list'];
}) {
  return (
    <PanelFrame locale={locale} face="members" words={words} signIn={signIn} saldoHref={saldoHref}>
      {(team) => (
        <PeopleMembers
          key={team.id}
          org={team.id}
          locale={locale}
          label={words.names.members}
          homeHref={homeHref}
          ui={ui}
          words={people}
          community={communities[team.id] ?? null}
          requests={requests}
        />
      )}
    </PanelFrame>
  );
}
