/**
 * The Web2→Web3 boundary — ONE configurable constant by decree (ADR-006 §3,
 * open-questions D13: "provisional, may change after QA"). Changing the
 * boundary is a one-line change here and nowhere else.
 */

import { rankLevel, type Rank } from '@numinia/domain';

export const WEB3_BOUNDARY_RANK: Rank = 'pilgrim';

/** Does an action requiring `minimumRank` demand a real wallet? */
export function walletRequiredFor(minimumRank: Rank): boolean {
  return rankLevel(minimumRank) >= rankLevel(WEB3_BOUNDARY_RANK);
}
