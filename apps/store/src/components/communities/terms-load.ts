/**
 * What the public page of a community's terms needs, read on the server: the
 * community from the register (only a published one: anything else is a 404,
 * the same answer for «not on file» and «only prepared») and its terms from
 * the till. The page itself is the same in every locale; this is the one
 * place the five routes ask.
 */

import { accountsFrom } from '../../lib/accounts-source';
import { readCommunityId } from '../../lib/community-teams';
import { PUBLIC_TERMS_CACHE, readPublicTerms, type PublicTermsDoc } from '../../lib/public-terms';
import { runtimeBinding } from '../../lib/runtime-env';
import type { Community } from '../../lib/communities';
import { COMMUNITIES } from './register';

export type TermsPageLoad =
  | { readonly status: 404 }
  | {
      readonly status: 200 | 502 | 503;
      readonly community: Community;
      /** Null when the till could not be read: the page says so instead of showing «no rules». */
      readonly doc: PublicTermsDoc | null;
      readonly cache: string;
    };

export async function loadTermsPage(id: string | undefined): Promise<TermsPageLoad> {
  const communityId = readCommunityId(id);
  const community = COMMUNITIES.find((candidate) => candidate.id === communityId);
  if (communityId === undefined || community === undefined) return { status: 404 };
  const read = await readPublicTerms(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    communityId,
  );
  if (read.ok) return { status: 200, community, doc: read.doc, cache: PUBLIC_TERMS_CACHE };
  return {
    status: read.response.status === 503 ? 503 : 502,
    community,
    doc: null,
    cache: 'no-store',
  };
}
