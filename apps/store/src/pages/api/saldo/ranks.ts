/**
 * «Rango» in the panel's Miembros: the city rank of each member of one
 * organization, to its members and the house only. `?cuenta=<account id>`.
 * The wallets come from the till's answer, never from the request; an
 * Oracle is the allowlist's word, anyone else the census's
 * (lib/member-ranks.ts). See ./index.ts for the trust model.
 */

import type { APIRoute } from 'astro';
import { SESSION_COOKIE, oracleWallets, rankForAddress } from '../../../lib/auth/server';
import { sessionAsker } from '../../../lib/auth/session-wallet';
import { accountsFrom } from '../../../lib/accounts-source';
import { answerRanks, censusOf } from '../../../lib/member-ranks';
import { runtimeBinding } from '../../../lib/runtime-env';
import { getStateStore } from '../../../lib/state/server';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) => {
  const store = getStateStore();
  return answerRanks(
    accountsFrom({ binding: runtimeBinding('TILL_ACCOUNTS'), dataSource: process.env.DATA_SOURCE }),
    await sessionAsker(cookies.get(SESSION_COOKIE)?.value),
    url,
    {
      isOracle: (wallet) => rankForAddress(wallet) === 'oracle',
      census: store === null ? null : censusOf(store, new Set(oracleWallets())),
    },
  );
};
