/**
 * «Una comunidad ES una organización» (cut 6, 2026-10-16), the store's half:
 * every community of the register (src/content/communities/*.md) is an
 * organization of the till, opened by the house the first time it uses it —
 * assigning a world, adding a person — and never by hand in Saldo. This file
 * is the house-only door to that: the register as the dialogs list it, and
 * the route that makes the till open a community's account.
 *
 * The account's id is derived from the community's id, so it needs no
 * storing in the markdown and two first uses at once open one account. The
 * till derives it too (apps/till); `communityAccountId` below is the same
 * formula, which the dialogs use to recognize an account the house already
 * opened and the fixture desk uses to open its own.
 *
 * Who asks is the session's, read from our own signed cookie
 * (lib/auth/session-wallet.ts `sessionAsker`), never from a body, a query or
 * a header. The trust model is lib/accounts-source.ts's. Server only.
 */

import { z } from 'zod';
import type { AccountDesk, Asker } from './accounts';
import type { Community } from './communities';
import { logEvent } from './telemetry';
import { answer, ask, bodyOf, forbidden, lowercase, notBound, type Log } from './worlds-homes';

/** A community's id as the register writes it (and the till reads it): lowercase letters, digits and hyphens. */
const COMMUNITY_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** The id of the till account of a community: `acc_t_` and 32 hex, like every organization's. */
export async function communityAccountId(communityId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`numinia-till community ${communityId}`),
  );
  const hex = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0'));
  return `acc_t_${hex.join('').slice(0, 32)}`;
}

/** A community id as the register writes it, or undefined. */
export function readCommunityId(value: unknown): string | undefined {
  return typeof value === 'string' && COMMUNITY_ID.test(value) ? value : undefined;
}

/** The body of the house's request — exactly `{ community }` — or null. */
export function readCommunityBody(json: unknown): { readonly community: string } | null {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return null;
  const community = readCommunityId((json as Readonly<Record<string, unknown>>).community);
  return Object.keys(json).length === 1 && community !== undefined ? { community } : null;
}

/** A community as the house's dialogs list it. */
export interface CommunityEntry {
  readonly id: string;
  readonly name: string;
  /** The organization the community's file links (`team:`), or null. */
  readonly team: string | null;
  /** The account the till opens for it: derived from the id, whether or not it exists yet. */
  readonly account: string;
}

/**
 * GET /api/admin/communities: the register's communities — the house-only
 * ones included — `{ communities: [{ id, name, team, account }] }`, to the
 * house alone (403 for any other session or none).
 */
export async function answerCommunities(
  register: readonly Community[],
  asker: Asker | null,
): Promise<Response> {
  if (asker === null || !asker.house) return forbidden();
  const communities: CommunityEntry[] = await Promise.all(
    register.map(async (community) => ({
      id: community.id,
      name: community.name,
      team: community.team ?? null,
      account: await communityAccountId(community.id),
    })),
  );
  return answer({ communities });
}

const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
const ensured = z.union([
  z.object({
    ok: z.literal(true),
    account: z.object({ id: z.string(), name: z.string(), created: z.boolean() }),
  }),
  refusal,
]);

/**
 * POST /api/admin/community-team, JSON `{ community }`: the house has the
 * till open that community's account (once) and gets `{ ok: true, account:
 * { id, name } }` — 403 for any other session before the body is read, 404
 * for a community the register lacks, 400 for a body out of shape or a
 * till's refusal, 503 without a till (or an older one), 502 when it fails.
 */
export async function answerCommunityTeam(
  desk: AccountDesk | null,
  asker: Asker | null,
  register: readonly Community[],
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (asker === null || !asker.house) return forbidden();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readCommunityBody(body.json);
  if (read === null) return answer({ error: 'body: { community }' }, 400);
  const community = register.find((entry) => entry.id === read.community);
  if (community === undefined) return answer({ error: 'no-community' }, 404);
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'ensureCommunityTeam',
    () => desk.ensureCommunityTeam(lowercase(asker), true, community.id, community.name),
    ensured,
  );
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) {
    const status = asked.value.problems.some((problem) => /\bhouse\b/.test(problem)) ? 403 : 400;
    return answer({ error: 'refused', problems: asked.value.problems }, status);
  }
  const { id, name } = asked.value.account;
  return answer({ ok: true, account: { id, name } });
}
