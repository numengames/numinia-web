import { describe, expect, it, vi } from 'vitest';
import {
  StateConfigError,
  parseStateEnv,
  toBase64,
  fromBase64,
  CensusRecordSchema,
  ModerationRecordSchema,
  censusPath,
  moderationPath,
  GitStateStore,
  StateConflictError,
  StateHttpError,
} from '../src/index.js';

const ENV = {
  STATE_REPO_OWNER: 'numengames',
  STATE_REPO_NAME: 'numinia-state',
  STATE_GITHUB_TOKEN: 'github_pat_0123456789abcdef0123456789abcdef01234567',
};

const CENSUS = {
  wallet: '0xabc0000000000000000000000000000000000001',
  rank: 'citizen',
  since: '2026-08-16T00:00:00.000Z',
  updatedAt: '2026-08-16T00:00:00.000Z',
  actor: '0xdef0000000000000000000000000000000000002',
} as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

function storeWith(fetchImpl: typeof fetch): GitStateStore {
  return new GitStateStore(parseStateEnv(ENV), fetchImpl);
}

describe('config — fail closed at boot (ADR-018, same doctrine as auth)', () => {
  it('parses a complete environment and defaults the branch to main', () => {
    const env = parseStateEnv(ENV);
    expect(env.owner).toBe('numengames');
    expect(env.repo).toBe('numinia-state');
    expect(env.branch).toBe('main');
  });

  it('honors an explicit branch', () => {
    expect(parseStateEnv({ ...ENV, STATE_BRANCH: 'work' }).branch).toBe('work');
  });

  it('crashes naming every missing variable — no fallback, ever', () => {
    expect(() => parseStateEnv({})).toThrowError(StateConfigError);
    try {
      parseStateEnv({ STATE_REPO_OWNER: 'x' });
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('STATE_REPO_NAME');
      expect(message).toContain('STATE_GITHUB_TOKEN');
    }
  });

  it('rejects a token that is too short to be real', () => {
    expect(() => parseStateEnv({ ...ENV, STATE_GITHUB_TOKEN: 'short' })).toThrowError(
      StateConfigError,
    );
  });
});

describe('base64 — standard alphabet with padding (GitHub contents API)', () => {
  it('round-trips unicode content', () => {
    const text = 'Numinia · Ágora — 都市 “quotes”';
    const bytes = new TextEncoder().encode(text);
    const decoded = fromBase64(toBase64(bytes));
    expect(decoded).not.toBeNull();
    expect(new TextDecoder().decode(decoded as Uint8Array)).toBe(text);
  });

  it('pads correctly at every remainder length', () => {
    expect(toBase64(new TextEncoder().encode('a'))).toBe('YQ==');
    expect(toBase64(new TextEncoder().encode('ab'))).toBe('YWI=');
    expect(toBase64(new TextEncoder().encode('abc'))).toBe('YWJj');
  });

  it('fails closed on characters outside the alphabet', () => {
    expect(fromBase64('not*base64')).toBeNull();
  });

  it('ignores whitespace, as the GitHub API embeds newlines', () => {
    const encoded = toBase64(new TextEncoder().encode('numinia'));
    const wrapped = `${encoded.slice(0, 4)}\n${encoded.slice(4)}`;
    expect(new TextDecoder().decode(fromBase64(wrapped) as Uint8Array)).toBe('numinia');
  });
});

describe('records — the census is public, moderation is private (D19)', () => {
  it('accepts a valid census record and lowercases nothing silently', () => {
    expect(CensusRecordSchema.parse(CENSUS)).toEqual(CENSUS);
  });

  it('rejects unknown ranks, malformed wallets, and unknown keys', () => {
    expect(() => CensusRecordSchema.parse({ ...CENSUS, rank: 'emperor' })).toThrow();
    expect(() => CensusRecordSchema.parse({ ...CENSUS, wallet: 'abc' })).toThrow();
    expect(() => CensusRecordSchema.parse({ ...CENSUS, extra: true })).toThrow();
  });

  it('rejects uppercase wallets — one wallet, one file, one spelling', () => {
    expect(() =>
      CensusRecordSchema.parse({ ...CENSUS, wallet: CENSUS.wallet.toUpperCase() }),
    ).toThrow();
  });

  it('moderation records demand an action and a reason', () => {
    const record = {
      wallet: CENSUS.wallet,
      action: 'ban',
      reason: 'spam in the Agora',
      at: '2026-08-16T00:00:00.000Z',
      actor: CENSUS.actor,
    };
    expect(ModerationRecordSchema.parse(record)).toEqual(record);
    expect(() => ModerationRecordSchema.parse({ ...record, action: 'shadowban' })).toThrow();
    expect(() => ModerationRecordSchema.parse({ ...record, reason: '' })).toThrow();
  });

  it('paths shard by entity: one wallet, one file', () => {
    expect(censusPath(CENSUS.wallet)).toBe(`census/${CENSUS.wallet}.json`);
    expect(moderationPath(CENSUS.wallet)).toBe(`moderation/${CENSUS.wallet}.json`);
  });
});

describe('GitStateStore — SHA-conditional reads and writes', () => {
  it('reads an existing record and returns its sha', async () => {
    const content = toBase64(new TextEncoder().encode(JSON.stringify(CENSUS)));
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      expect(String(input)).toBe(
        `https://api.github.com/repos/numengames/numinia-state/contents/${censusPath(CENSUS.wallet)}?ref=main`,
      );
      expect(new Headers(init?.headers).get('authorization')).toBe(
        `Bearer ${ENV.STATE_GITHUB_TOKEN}`,
      );
      return jsonResponse(200, { content, sha: 'abc123' });
    }) as unknown as typeof fetch;
    const found = await storeWith(fetchImpl).read(censusPath(CENSUS.wallet), CensusRecordSchema);
    expect(found).toEqual({ record: CENSUS, sha: 'abc123' });
  });

  it('returns null on 404 — absence is an answer, not an error', async () => {
    const fetchImpl = (async () => jsonResponse(404, {})) as unknown as typeof fetch;
    expect(await storeWith(fetchImpl).read('census/none.json', CensusRecordSchema)).toBeNull();
  });

  it('throws loudly on any other status', async () => {
    const fetchImpl = (async () => jsonResponse(500, {})) as unknown as typeof fetch;
    await expect(storeWith(fetchImpl).read('census/x.json', CensusRecordSchema)).rejects.toThrow(
      StateHttpError,
    );
  });

  it('rejects records that fail the schema — poisoned state never enters', async () => {
    const bad = toBase64(new TextEncoder().encode(JSON.stringify({ hello: 'world' })));
    const fetchImpl = (async () =>
      jsonResponse(200, { content: bad, sha: 's' })) as unknown as typeof fetch;
    await expect(storeWith(fetchImpl).read('census/x.json', CensusRecordSchema)).rejects.toThrow();
  });

  it('rejects undecodable content', async () => {
    const fetchImpl = (async () =>
      jsonResponse(200, { content: '***', sha: 's' })) as unknown as typeof fetch;
    await expect(storeWith(fetchImpl).read('census/x.json', CensusRecordSchema)).rejects.toThrow(
      StateHttpError,
    );
  });

  it('writes a new record with the acting wallet in the commit trailer', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      expect(init?.method).toBe('PUT');
      const body = JSON.parse(String(init?.body)) as {
        message: string;
        content: string;
        branch: string;
        sha?: string;
      };
      expect(body.message).toBe(
        `census: citizen enters the record\n\nActing-Wallet: ${CENSUS.actor}`,
      );
      expect(body.branch).toBe('main');
      expect(body.sha).toBeUndefined();
      const decoded = fromBase64(body.content);
      expect(JSON.parse(new TextDecoder().decode(decoded as Uint8Array))).toEqual(CENSUS);
      return jsonResponse(201, { content: { sha: 'new-sha' } });
    }) as unknown as typeof fetch;
    const sha = await storeWith(fetchImpl).write(censusPath(CENSUS.wallet), CENSUS, {
      message: 'census: citizen enters the record',
      actor: CENSUS.actor,
    });
    expect(sha).toBe('new-sha');
  });

  it('sends the previous sha on update — blind overwrites are impossible', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      expect((JSON.parse(String(init?.body)) as { sha?: string }).sha).toBe('old-sha');
      return jsonResponse(200, { content: { sha: 'newer' } });
    }) as unknown as typeof fetch;
    const sha = await storeWith(fetchImpl).write(censusPath(CENSUS.wallet), CENSUS, {
      message: 'census: rank changes',
      actor: CENSUS.actor,
      sha: 'old-sha',
    });
    expect(sha).toBe('newer');
  });

  it('a 409 or 422 surfaces as StateConflictError — the caller re-reads and retries', async () => {
    for (const status of [409, 422]) {
      const fetchImpl = (async () => jsonResponse(status, {})) as unknown as typeof fetch;
      await expect(
        storeWith(fetchImpl).write('census/x.json', CENSUS, {
          message: 'm',
          actor: CENSUS.actor,
          sha: 'stale',
        }),
      ).rejects.toThrow(StateConflictError);
    }
  });

  it('any other write failure throws loudly with the status', async () => {
    const fetchImpl = (async () => jsonResponse(403, {})) as unknown as typeof fetch;
    await expect(
      storeWith(fetchImpl).write('census/x.json', CENSUS, {
        message: 'm',
        actor: CENSUS.actor,
      }),
    ).rejects.toThrow(StateHttpError);
  });
});

describe('mutation-hardening — the details that carry doctrine', () => {
  it('config errors NAME the variable and the class, one per line', () => {
    try {
      parseStateEnv({ STATE_REPO_OWNER: '', STATE_REPO_NAME: '', STATE_GITHUB_TOKEN: 'short' });
      expect.unreachable('parseStateEnv must throw on empty values');
    } catch (error) {
      const err = error as Error;
      expect(err.name).toBe('StateConfigError');
      expect(err.message).toContain('STATE_REPO_OWNER must be set');
      expect(err.message).toContain('STATE_REPO_NAME must be set');
      expect(err.message).toContain('STATE_GITHUB_TOKEN looks too short to be real');
      expect(err.message).toContain('\n  STATE_REPO_NAME');
      expect(err.message).toContain('STATE_REPO_OWNER: ');
    }
  });

  it('base64 decoding skips every whitespace kind and matches exact vectors', () => {
    const abc = toBase64(new TextEncoder().encode('abc'));
    expect(abc).toBe('YWJj');
    for (const noise of ['YW\rJj', 'YW\tJj', 'YW Jj', 'Y\nWJj']) {
      expect(new TextDecoder().decode(fromBase64(noise) as Uint8Array), noise).toBe('abc');
    }
    // Exact byte grouping across a full 4-char group boundary.
    expect([...(fromBase64('YWJjZA==') as Uint8Array)]).toEqual([97, 98, 99, 100]);
    expect([...(fromBase64('TnVtaW5pYQ==') as Uint8Array)]).toEqual([
      78, 117, 109, 105, 110, 105, 97,
    ]);
  });

  it('wallet anchors hold in records: no prefix junk, no suffix junk', () => {
    for (const wallet of [`z${CENSUS.wallet}`, `${CENSUS.wallet}ff`]) {
      expect(() => CensusRecordSchema.parse({ ...CENSUS, wallet }), wallet).toThrow();
    }
  });

  it('unban is a real action and the reason rule speaks its doctrine', () => {
    const base = {
      wallet: CENSUS.wallet,
      action: 'unban',
      reason: 'appeal accepted',
      at: '2026-08-16T00:00:00.000Z',
      actor: CENSUS.actor,
    };
    expect(ModerationRecordSchema.parse(base).action).toBe('unban');
    const failed = ModerationRecordSchema.safeParse({ ...base, reason: '' });
    expect(failed.success).toBe(false);
    if (!failed.success) {
      expect(failed.error.issues[0]?.message).toBe('moderation without a reason is not governance');
    }
  });

  it('requests speak as numinia-state with the GitHub accept header', async () => {
    const fetchImpl = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('accept')).toBe('application/vnd.github+json');
      expect(headers.get('user-agent')).toBe('numinia-state');
      return jsonResponse(404, {});
    }) as unknown as typeof fetch;
    await storeWith(fetchImpl).read('census/x.json', CensusRecordSchema);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('errors carry their names and their evidence', async () => {
    const fetchImpl = (async () => jsonResponse(500, {})) as unknown as typeof fetch;
    try {
      await storeWith(fetchImpl).read('census/x.json', CensusRecordSchema);
      expect.unreachable('read must throw on 500');
    } catch (error) {
      const err = error as Error;
      expect(err.name).toBe('StateHttpError');
      expect(err.message).toContain('500');
      expect(err.message).toContain('GET census/x.json');
    }
    const conflicting = (async () => jsonResponse(409, {})) as unknown as typeof fetch;
    try {
      await storeWith(conflicting).write('census/x.json', CENSUS, {
        message: 'm',
        actor: CENSUS.actor,
        sha: 's',
      });
      expect.unreachable('write must throw on 409');
    } catch (error) {
      const err = error as Error;
      expect(err.name).toBe('StateConflictError');
      expect(err.message).toContain('census/x.json');
      expect(err.message).toContain('retry');
    }
    const forbidden = (async () => jsonResponse(403, {})) as unknown as typeof fetch;
    await expect(
      storeWith(forbidden).write('census/x.json', CENSUS, { message: 'm', actor: CENSUS.actor }),
    ).rejects.toThrow(/PUT census\/x\.json/);
  });

  it('undecodable content names itself', async () => {
    const fetchImpl = (async () =>
      jsonResponse(200, { content: '***', sha: 's' })) as unknown as typeof fetch;
    await expect(storeWith(fetchImpl).read('census/x.json', CensusRecordSchema)).rejects.toThrow(
      /undecodable content at census\/x\.json/,
    );
  });
});
