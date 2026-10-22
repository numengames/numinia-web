/**
 * The signed list of Oracles and Archons: GET /fleet/signers.json —
 * `{ message: { signers, seq, issuedAt }, signature }`, what the house
 * wallet signed and every machine's signers timer reads and checks again.
 * Public, cached a minute; see lib/fleet-signers-source.ts.
 */

import type { APIRoute } from 'astro';
import { oracleWallets } from '../../lib/auth/server';
import { answerSigners, signersDeskFrom } from '../../lib/fleet-signers-source';
import { runtimeBinding } from '../../lib/runtime-env';
import { getStateStore } from '../../lib/state/server';

export const prerender = false;

export const GET: APIRoute = async () =>
  answerSigners(
    signersDeskFrom({
      binding: runtimeBinding('TILL_FLEET'),
      dataSource: process.env.DATA_SOURCE,
    }),
    { oracles: oracleWallets, census: getStateStore() },
  );
