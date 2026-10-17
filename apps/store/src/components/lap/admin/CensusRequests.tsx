/**
 * «Peticiones» in the house's Census (cut G «Hazla tuya»): every open claim
 * and join across all communities, newest first, with the community's name
 * — so the house sees each claim in one place and decides. The section
 * around it is hidden until the chrome knows the session is an Oracle's,
 * and this island asks for the list only then (as «Quién ha entrado» does).
 */

import { useEffect, useState } from 'react';
import type { SupportedLocale } from '@numinia/domain';
import type { CommunityRequestsMessages } from '../../../i18n/community-requests';
import type { SaldoMessages } from '../../../i18n/saldo';
import { isHouseSession } from '../../../lib/census-list';
import { pageSessionClient } from '../../../lib/island-session';
import { PeopleRequests } from '../../panel/PeopleRequests';

export function CensusRequests({
  locale,
  words,
  ui,
  communities,
}: {
  readonly locale: SupportedLocale;
  readonly words: CommunityRequestsMessages['list'];
  readonly ui: SaldoMessages;
  /** The communities' names by id. */
  readonly communities: Readonly<Record<string, string>>;
}) {
  const [house, setHouse] = useState(false);

  useEffect(() => {
    let live = true;
    let stop: (() => void) | null = null;
    const hear = (view: { readonly status: string; readonly rank?: string }): void => {
      if (live) setHouse(isHouseSession(view));
    };
    void pageSessionClient(window).then((client) => {
      if (!live) return;
      stop = client.subscribe(hear);
      void client.current().then(hear);
    });
    return () => {
      live = false;
      stop?.();
    };
  }, []);

  if (!house) return null;
  return (
    <PeopleRequests
      community={null}
      communities={communities}
      locale={locale}
      words={words}
      ui={ui}
      always
    />
  );
}
