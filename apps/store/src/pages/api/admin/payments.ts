/**
 * The Prices room's watch on the till's poll of Stripe: where it has read
 * up to, and whether it is more than two days behind (Stripe keeps events
 * 30 days). Oracles only — the same gate as ./prices.ts (our own signed
 * session, permission `edit-system-config`); anyone else gets 403.
 */

import type { APIRoute } from 'astro';
import { hasPermission } from '@numinia/domain';
import { authConfigured, SESSION_COOKIE, verifySession } from '../../../lib/auth/server';
import { answerPaymentsHealth } from '../../../lib/payments-health';
import { runtimeBinding } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  const result = authConfigured() && token ? await verifySession(token) : null;
  if (
    result === null ||
    !result.valid ||
    !hasPermission(result.payload.rank, 'edit-system-config')
  ) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return answerPaymentsHealth(runtimeBinding('TILL_ORACLE'), process.env.DATA_SOURCE);
};
