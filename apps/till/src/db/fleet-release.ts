/**
 * The signed FleetRelease record (fleet auto-update, story S4): the till
 * keeps what an Oracle's wallet signed and refuses to go backwards. It holds
 * no key; migration 0019's table only ever grows. Every argument comes from
 * numinia.com and is read as untrusted.
 */

import { readWallet } from '../lib/accounts';
import {
  RELEASE_ENGINE,
  RELEASE_PROBLEMS,
  readRelease,
  releaseSigner,
  type SignedRelease,
} from '../lib/fleet-release';
import { ORG_PROBLEMS, readHouse } from '../lib/organizations';
import { PROBLEMS, refuse, type Refusal } from './accounts';
import type { Row, TillDatabase } from './repository';

export type PublishAnswer =
  | {
      readonly ok: true;
      readonly seq: number;
      readonly image: string;
      readonly commit: string;
    }
  | Refusal;

/** The latest record, as machines read it, and when it was stored; `release` is null before the first. */
export type LatestAnswer = {
  readonly ok: true;
  readonly release: SignedRelease | null;
  readonly publishedAt: string | null;
};

// One statement, so two publications at once cannot both pass: the row goes in
// only when no stored `seq` of this engine is as high as the new one.
const INSERT_RELEASE = `
  INSERT INTO fleet_releases
    (engine, seq, image, commit_sha, issued_at, signature, signer, published_by, published_at)
  SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
   WHERE NOT EXISTS (SELECT 1 FROM fleet_releases WHERE engine = ?1 AND seq >= ?2)`;

const SELECT_LATEST = `
  SELECT engine, seq, image, commit_sha, issued_at, signature, published_at
    FROM fleet_releases WHERE engine = ?1 ORDER BY seq DESC LIMIT 1`;

/**
 * `FleetDesk.publish`: the house stores a record its Oracle signed. The
 * signature must be the publishing wallet's, and `seq` greater than the
 * latest stored (volver atrás is a new record with a greater `seq`).
 */
export async function publishRelease(
  db: TillDatabase,
  sentWallet: unknown,
  sentHouse: unknown,
  sentRecord: unknown,
  now: Date,
): Promise<PublishAnswer> {
  const wallet = readWallet(sentWallet);
  const house = readHouse(sentHouse);
  const record = readRelease(sentRecord);
  if (wallet === undefined || house === undefined || record === undefined) {
    return refuse(
      ...(wallet === undefined ? [PROBLEMS.wallet] : []),
      ...(house === undefined ? [ORG_PROBLEMS.house] : []),
      ...(record === undefined ? [RELEASE_PROBLEMS.record] : []),
    );
  }
  if (!house) return refuse(RELEASE_PROBLEMS.notHouse);
  const signer = await releaseSigner(record);
  if (signer !== wallet) return refuse(RELEASE_PROBLEMS.signer);
  const { message, signature } = record;
  const { meta } = await db
    .prepare(INSERT_RELEASE)
    .bind(
      message.engine,
      message.seq,
      message.image,
      message.commit,
      message.issuedAt,
      signature,
      signer,
      wallet,
      now.toISOString(),
    )
    .run();
  if (meta.changes === 0) return refuse(RELEASE_PROBLEMS.stale);
  return { ok: true, seq: message.seq, image: message.image, commit: message.commit };
}

/** `FleetDesk.latest`: the highest-`seq` record, to anyone (it is public). */
export async function latestRelease(db: TillDatabase): Promise<LatestAnswer> {
  const { results } = await db.prepare(SELECT_LATEST).bind(RELEASE_ENGINE).all<Row>();
  const row = results[0];
  if (row === undefined) return { ok: true, release: null, publishedAt: null };
  return {
    ok: true,
    release: {
      message: {
        engine: RELEASE_ENGINE,
        image: String(row['image']),
        commit: String(row['commit_sha']),
        seq: Number(row['seq']),
        issuedAt: Number(row['issued_at']),
      },
      signature: String(row['signature']),
    },
    publishedAt: String(row['published_at']),
  };
}
