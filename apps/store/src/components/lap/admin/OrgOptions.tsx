/**
 * The options of the house's organization select — the Worlds room's and the
 * Census's — as `<optgroup>`s: the register's communities, then the till's
 * other organizations («Otras»). With only one kind there is no group label
 * to read.
 */

import type { OrgChoiceMessages } from '../../../i18n/org-choices';
import type { OrgChoice } from '../../../lib/org-choices';

const options = (list: readonly OrgChoice[]) =>
  list.map((choice) => (
    <option key={choice.key} value={choice.key}>
      {choice.label}
    </option>
  ));

export function OrgOptions({
  list,
  words,
}: {
  readonly list: readonly OrgChoice[];
  readonly words: OrgChoiceMessages;
}) {
  const communities = list.filter((choice) => choice.community !== null);
  const others = list.filter((choice) => choice.community === null);
  if (communities.length === 0 || others.length === 0) return <>{options(list)}</>;
  return (
    <>
      <optgroup label={words.communitiesGroup}>{options(communities)}</optgroup>
      <optgroup label={words.othersGroup}>{options(others)}</optgroup>
    </>
  );
}
