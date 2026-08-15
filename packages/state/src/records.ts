/**
 * Entity records — the shapes the state repo holds (ADR-018).
 * The census is public data (D19); moderation is private. Both are strict:
 * unknown keys, unknown ranks, or malformed wallets never enter the record.
 */

import { RANKS } from '@numinia/domain';
import { z } from 'zod';

/** One wallet, one file, one spelling: lowercase hex only. */
const wallet = z
  .string()
  .regex(/^0x[0-9a-f]{40}$/, 'wallet must be a lowercase 0x-prefixed address');

const isoDate = z.string().datetime();

export const CensusRecordSchema = z
  .object({
    wallet,
    rank: z.enum(RANKS),
    since: isoDate,
    updatedAt: isoDate,
    /** The wallet whose session performed the last change — the pen. */
    actor: wallet,
  })
  .strict();

export type CensusRecord = z.infer<typeof CensusRecordSchema>;

export const ModerationRecordSchema = z
  .object({
    wallet,
    action: z.enum(['ban', 'unban']),
    reason: z.string().min(1, 'moderation without a reason is not governance'),
    at: isoDate,
    actor: wallet,
  })
  .strict();

export type ModerationRecord = z.infer<typeof ModerationRecordSchema>;

export function censusPath(walletAddress: string): string {
  return `census/${walletAddress}.json`;
}

export function moderationPath(walletAddress: string): string {
  return `moderation/${walletAddress}.json`;
}
