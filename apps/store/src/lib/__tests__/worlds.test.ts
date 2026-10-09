/**
 * The worlds room's model: the order rules (mirroring numinia-assets'
 * own test one for one), the wizard's draft, the rows the room shows
 * (order × card × probe × proposal), the filters, the views' grouping and
 * the GitHub fallbacks.
 */

import { describe, expect, it } from 'vitest';
import type { SummaCard } from '../summa';
import {
  DEFAULT_IMAGE,
  buildRows,
  buildTag,
  changeBranch,
  deleteOrderUrl,
  describeStatus,
  draftToOrder,
  editOrderUrl,
  emptyDraft,
  fill,
  filterRows,
  fleetHistoryUrl,
  fleetServers,
  fleetStats,
  formatUptime,
  groupByServer,
  newOrderUrl,
  orderFileUrl,
  orderProblems,
  parseChangeBranch,
  parseOrder,
  problemFields,
  proposalBody,
  proposalCommit,
  proposalTitle,
  readProbe,
  renderOrder,
  rowPlace,
  suggestDomain,
  withState,
  worldCards,
  type PendingChange,
  type ReasonWords,
  type WorldOrder,
  type WorldRow,
} from '../worlds';

const VALID: WorldOrder = {
  id: 'example-world',
  card: 'example-world',
  state: 'running',
  server: 'open-1',
  domain: 'example.numen.games',
  image: 'ghcr.io/numengames/numinia-hyperfy2:sha-0123456',
  limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
};

const json = (value: unknown): string => JSON.stringify(value);

describe('orderProblems — the depot test, one rule at a time', () => {
  it('accepts the depot README example', () => {
    expect(orderProblems(json(VALID), 'example-world')).toEqual([]);
  });

  it('refuses what is not JSON, or not an object', () => {
    expect(orderProblems('{nope', 'x')).toEqual(['json']);
    expect(orderProblems('[1,2]', 'x')).toEqual(['object']);
    expect(orderProblems('null', 'x')).toEqual(['object']);
  });

  it.each([
    ['missing field', { ...VALID, card: undefined }, 'fields'],
    ['id differs from file', { ...VALID, id: 'other' }, 'file-name'],
    ['unknown state', { ...VALID, state: 'paused' }, 'state'],
    ['unpinned image', { ...VALID, image: 'ghcr.io/numengames/numinia-hyperfy2:latest' }, 'image'],
    ['ip as server', { ...VALID, server: '51.68.1.2' }, 'server'],
    ['ip in domain', { ...VALID, domain: '51.68.1.2' }, 'domain'],
    ['bad memory', { ...VALID, limits: { ...VALID.limits, memory: 'lots' } }, 'memory'],
    ['bad cpus', { ...VALID, limits: { ...VALID.limits, cpus: 'many' } }, 'cpus'],
    ['zero upload', { ...VALID, limits: { ...VALID.limits, maxUploadMb: 0 } }, 'upload'],
    ['fractional upload', { ...VALID, limits: { ...VALID.limits, maxUploadMb: 1.5 } }, 'upload'],
    ['string upload', { ...VALID, limits: { ...VALID.limits, maxUploadMb: '50' } }, 'upload'],
    ['limits not an object', { ...VALID, limits: 'big' }, 'limits'],
    ['limits with an extra key', { ...VALID, limits: { ...VALID.limits, disk: '10g' } }, 'limits'],
    ['extra secret field', { ...VALID, jwt_secret: 'x' }, 'secret'],
    ['uppercase card', { ...VALID, card: 'Example' }, 'card'],
    ['bad id', { ...VALID, id: 'Bad Id' }, 'id'],
    ['non-string domain', { ...VALID, domain: 42 }, 'domain'],
  ])('refuses %s', (_label, order, problem) => {
    expect(orderProblems(json(order), 'example-world')).toContain(problem);
  });

  it('sees an IP anywhere in the text', () => {
    const problems = orderProblems(
      json({ ...VALID, server: 'open-1' }).replace('open-1', 'open-1 10.0.0.1'),
      'example-world',
    );
    expect(problems).toContain('ip');
  });

  it('accepts a digest-pinned image', () => {
    const digest = `ghcr.io/numengames/numinia-hyperfy2@sha256:${'a'.repeat(64)}`;
    expect(orderProblems(json({ ...VALID, image: digest }), 'example-world')).toEqual([]);
  });
});

describe('parseOrder', () => {
  it('returns the order when valid', () => {
    expect(parseOrder(json(VALID), 'example-world')).toEqual({ order: VALID });
  });

  it('returns the problems when not', () => {
    expect(parseOrder(json({ ...VALID, state: 'paused' }), 'example-world')).toEqual({
      problems: ['state'],
    });
  });
});

describe('renderOrder', () => {
  it('writes the depot shape: fixed key order, two spaces, final newline', () => {
    const shuffled = {
      ...VALID,
      limits: { maxUploadMb: 50, cpus: '1.5', memory: '2g' },
    } as WorldOrder;
    const text = renderOrder(shuffled);
    expect(text.endsWith('}\n')).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual([
      'id',
      'card',
      'state',
      'server',
      'domain',
      'image',
      'limits',
    ]);
    expect(Object.keys(JSON.parse(text).limits)).toEqual(['memory', 'cpus', 'maxUploadMb']);
    expect(text).toContain('\n  "id": "example-world"');
    expect(orderProblems(text, 'example-world')).toEqual([]);
  });
});

describe('the wizard draft', () => {
  it('starts with the house defaults and the given server', () => {
    const draft = emptyDraft('open-2');
    expect(draft.server).toBe('open-2');
    expect(draft.image).toBe(DEFAULT_IMAGE);
    expect(draft.maxUploadMb).toBe('50');
    expect(emptyDraft().server).toBe('open-1');
  });

  it('suggests an address under numen.games', () => {
    expect(suggestDomain('trg-2026')).toBe('trg-2026.numen.games');
    expect(suggestDomain('')).toBe('');
  });

  it('becomes an order when the depot rules accept it — trimmed and lowercased', () => {
    const result = draftToOrder({
      ...emptyDraft(),
      id: ' TRG-2026 ',
      card: 'trg-2026',
      domain: 'TRG.numen.games',
    });
    expect(result).toEqual({
      order: {
        id: 'trg-2026',
        card: 'trg-2026',
        state: 'running',
        server: 'open-1',
        domain: 'trg.numen.games',
        image: DEFAULT_IMAGE,
        limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
      },
    });
  });

  it('names what is wrong otherwise', () => {
    const result = draftToOrder({
      ...emptyDraft(),
      id: 'x-',
      card: '',
      domain: '10.0.0.1',
      maxUploadMb: 'lots',
    });
    expect('problems' in result && result.problems).toEqual(
      expect.arrayContaining(['id', 'card', 'domain', 'upload', 'ip']),
    );
  });

  it('maps problems to the fields to mark, once each', () => {
    expect(problemFields(['ip', 'domain', 'file-name', 'id', 'secret', 'upload'])).toEqual([
      'domain',
      'id',
      'other',
      'upload',
    ]);
  });
});

const card = (slug: string, entity: string, forms: SummaCard['forms']): SummaCard => ({
  slug,
  path: `objects/${slug}.md`,
  id: slug,
  title: slug.toUpperCase(),
  entity,
  status: 'draft',
  version: '0.1.0',
  license: 'CC0-1.0',
  related: [],
  forms,
});

describe('worldCards', () => {
  it('keeps world cards only, with the first copy of their cover form, by title', () => {
    const cards = worldCards([
      card('zeta', 'world', [
        {
          role: 'cover',
          format: 'webp',
          license: 'CC0-1.0',
          rights_holder: 'x',
          copies: [
            { sha256: 'a', bytes: 1 },
            { url: 'https://c/z.webp', sha256: 'a', bytes: 1 },
          ],
        },
      ]),
      card('alpha', 'world', [
        { role: 'export', format: 'zip', license: 'CC0-1.0', rights_holder: 'x', copies: [] },
      ]),
      card('avocado', 'object', []),
    ]);
    expect(cards).toEqual([
      { slug: 'alpha', title: 'ALPHA', cover: null },
      { slug: 'zeta', title: 'ZETA', cover: 'https://c/z.webp' },
    ]);
  });
});

describe('readProbe — counts only, never names', () => {
  it('keeps the number of visitors, the uptime and a short commit', () => {
    expect(
      readProbe({
        uptime: 120,
        protected: true,
        connectedUsers: [{ id: 'a', name: 'Ana', position: [0, 0, 0] }],
        commitHash: '0e2045370989d051',
      }),
    ).toEqual({ ok: true, users: 1, uptime: 120, commit: '0e20453' });
  });

  it('copes with no commit', () => {
    expect(readProbe({ uptime: 1, connectedUsers: [], commitHash: '' })).toEqual({
      ok: true,
      users: 0,
      uptime: 1,
      commit: null,
    });
    expect(readProbe({ uptime: 1, connectedUsers: [] })).toMatchObject({ commit: null });
  });

  it('refuses anything that is not a world status', () => {
    expect(readProbe('hello')).toEqual({ ok: false, reason: 'shape' });
    expect(readProbe({ uptime: 'long', connectedUsers: [] })).toEqual({
      ok: false,
      reason: 'shape',
    });
    expect(readProbe({ uptime: 1, connectedUsers: 'many' })).toEqual({
      ok: false,
      reason: 'shape',
    });
  });
});

describe('proposals', () => {
  it('names its branches so the room recognises its own, and nothing else', () => {
    const branch = changeBranch('trg-2026', 'stop', 'lz8k2');
    expect(branch).toBe('open-worlds/trg-2026/stop-lz8k2');
    expect(parseChangeBranch(branch)).toEqual({ id: 'trg-2026', action: 'stop' });
    expect(parseChangeBranch('dependabot/npm/foo')).toBeNull();
    expect(parseChangeBranch('open-worlds/trg-2026/delete-lz8k2')).toBeNull();
  });

  it('flips the state and nothing else', () => {
    expect(withState(VALID, 'stopped')).toEqual({ ...VALID, state: 'stopped' });
  });

  it('writes the title, the commit with the acting wallet, and the body', () => {
    expect(proposalTitle('create', 'trg')).toBe('feat(open-worlds): order the world trg');
    expect(proposalTitle('close', 'trg')).toBe('chore(open-worlds): close the world trg');
    expect(proposalCommit('stop', 'trg', '0xabc')).toBe(
      'chore(open-worlds): stop the world trg\n\nActing-Wallet: 0xabc',
    );
    const body = proposalBody('close', 'trg', '0xabc');
    expect(body).toContain('`open-worlds/trg.json`');
    expect(body).toContain('`0xabc`');
    expect(body).toContain('nothing is deleted');
  });
});

describe('GitHub fallbacks', () => {
  it('prefills the new-file page with the order', () => {
    const url = new URL(newOrderUrl(VALID));
    expect(url.pathname).toBe('/numengames/numinia-assets/new/main/open-worlds');
    expect(url.searchParams.get('filename')).toBe('example-world.json');
    expect(url.searchParams.get('value')).toBe(renderOrder(VALID));
  });

  it('points at the order file to edit, delete or read, and at the history', () => {
    expect(editOrderUrl('x')).toBe(
      'https://github.com/numengames/numinia-assets/edit/main/open-worlds/x.json',
    );
    expect(deleteOrderUrl('x')).toBe(
      'https://github.com/numengames/numinia-assets/delete/main/open-worlds/x.json',
    );
    expect(orderFileUrl('x')).toBe(
      'https://github.com/numengames/numinia-assets/blob/main/open-worlds/x.json',
    );
    expect(fleetHistoryUrl()).toBe(
      'https://github.com/numengames/numinia-assets/commits/main/open-worlds',
    );
  });
});

const order = (id: string, extra: Partial<WorldOrder> = {}): WorldOrder => ({
  ...VALID,
  id,
  card: id,
  domain: `${id}.numen.games`,
  ...extra,
});

const pending = (id: string, action: PendingChange['action'], number: number): PendingChange => ({
  id,
  action,
  number,
  url: `https://github.com/numengames/numinia-assets/pull/${number}`,
});

function sampleRows(): WorldRow[] {
  return buildRows({
    orders: [
      order('agora'),
      order('forge', { server: 'open-2' }),
      order('akasha', { state: 'stopped', server: 'open-2' }),
      order('orphan', { card: 'no-card' }),
      order('silent'),
    ],
    cards: [
      { slug: 'agora', title: 'Agora', cover: '/a.webp' },
      { slug: 'forge', title: 'Forge', cover: null },
      { slug: 'akasha', title: 'Akasha', cover: '/k.webp' },
      { slug: 'circle', title: 'Circle', cover: '/c.webp' },
    ],
    probes: {
      agora: { ok: true, users: 3, uptime: 7200, commit: 'abc1234' },
      forge: { ok: false, reason: 'http', status: 502 },
      orphan: { ok: true, users: 0, uptime: 60, commit: null },
    },
    pending: [
      pending('circle', 'create', 14),
      pending('forge', 'stop', 13),
      pending('agora', 'create', 15),
    ],
  });
}

describe('buildRows — what was asked for, crossed with what answers', () => {
  it('derives every status and keeps the card, cover and proposal', () => {
    const rows = sampleRows();
    const by = (id: string): WorldRow => rows.find((row) => row.id === id) as WorldRow;
    expect(rows.map((row) => row.id)).toEqual([
      'agora',
      'akasha',
      'circle',
      'forge',
      'orphan',
      'silent',
    ]);
    expect(by('agora')).toMatchObject({
      status: 'running',
      title: 'Agora',
      cover: '/a.webp',
      missingCard: false,
    });
    expect(by('forge')).toMatchObject({ status: 'unreachable', pending: { number: 13 } });
    expect(by('akasha')).toMatchObject({ status: 'stopped', probe: null });
    expect(by('orphan')).toMatchObject({
      status: 'running',
      title: 'orphan',
      cover: null,
      missingCard: true,
    });
    expect(by('silent')).toMatchObject({ status: 'unknown', missingCard: true });
    expect(by('circle')).toMatchObject({
      status: 'requested',
      order: null,
      title: 'Circle',
      cover: '/c.webp',
    });
  });

  it('shows a requested world even before its card exists', () => {
    const rows = buildRows({
      orders: [],
      cards: [],
      probes: {},
      pending: [pending('new-one', 'create', 3)],
    });
    expect(rows).toEqual([
      expect.objectContaining({
        id: 'new-one',
        title: 'new-one',
        cover: null,
        status: 'requested',
      }),
    ]);
  });

  it('breaks title ties by id', () => {
    const rows = buildRows({
      orders: [order('b'), order('a')],
      cards: [
        { slug: 'a', title: 'Same', cover: null },
        { slug: 'b', title: 'Same', cover: null },
      ],
      probes: {},
      pending: [],
    });
    expect(rows.map((row) => row.id)).toEqual(['a', 'b']);
  });
});

describe('legacy worlds and faces — watched, never changed', () => {
  const hive = { id: 'hive', domain: 'hive.numinia.com', server: 'old-1' };
  const quiet = { id: 'quiet', domain: 'quiet.numinia.com', server: 'old-1' };
  const moved = { id: 'moved', domain: 'agora.numen.games', server: 'old-1' };

  function legacyRows(): WorldRow[] {
    return buildRows({
      orders: [order('agora'), order('bare')],
      cards: [{ slug: 'agora', title: 'Agora', cover: '/a.webp' }],
      probes: {
        hive: { ok: true, users: 2, uptime: 60, commit: '0e20453' },
        quiet: { ok: false, reason: 'timeout' },
      },
      pending: [],
      legacy: [hive, quiet, moved, { ...moved, id: 'agora', domain: 'elsewhere.numinia.com' }],
      faces: {
        hive: { title: 'The Hive', image: 'https://hive.numinia.com/assets/x.jpeg' },
        bare: { title: 'Bare World', image: null },
        agora: { title: 'Ignored: the card wins', image: '/ignored.webp' },
      },
    });
  }

  it('lists a legacy world with its own face and live status, and no order', () => {
    const rows = legacyRows();
    const by = (id: string): WorldRow => rows.find((row) => row.id === id) as WorldRow;
    expect(by('hive')).toMatchObject({
      title: 'The Hive',
      cover: 'https://hive.numinia.com/assets/x.jpeg',
      status: 'running',
      order: null,
      pending: null,
      missingCard: false,
      legacy: hive,
    });
    expect(by('quiet')).toMatchObject({ title: 'quiet', cover: null, status: 'unreachable' });
  });

  it('drops a legacy world once an order holds its id or its address', () => {
    const ids = legacyRows().map((row) => row.id);
    expect(ids).not.toContain('moved');
    expect(ids.filter((id) => id === 'agora')).toHaveLength(1);
  });

  it('names and pictures an ordered world without a card by its own page; the card wins', () => {
    const rows = legacyRows();
    expect(rows.find((row) => row.id === 'bare')).toMatchObject({
      title: 'Bare World',
      cover: null,
      missingCard: true,
      legacy: null,
    });
    expect(rows.find((row) => row.id === 'agora')).toMatchObject({
      title: 'Agora',
      cover: '/a.webp',
    });
  });

  it('knows nothing of a legacy world that was never probed', () => {
    const [row] = buildRows({ orders: [], cards: [], probes: {}, pending: [], legacy: [hive] });
    expect(row).toMatchObject({ status: 'unknown', title: 'hive', probe: null });
  });

  it('places, filters and groups a legacy world by its server', () => {
    const rows = legacyRows();
    const hiveRow = rows.find((row) => row.id === 'hive') as WorldRow;
    expect(rowPlace(hiveRow)).toEqual(hive);
    expect(rowPlace(rows.find((row) => row.id === 'agora') as WorldRow)).toMatchObject({
      server: 'open-1',
      domain: 'agora.numen.games',
    });
    expect(fleetServers(rows)).toEqual(['old-1', 'open-1']);
    const all = { query: '', status: 'all', server: '' } as const;
    expect(filterRows(rows, { ...all, server: 'old-1' }).map((row) => row.id)).toEqual([
      'quiet',
      'hive',
    ]);
    expect(filterRows(rows, { ...all, query: 'hive.numinia' }).map((row) => row.id)).toEqual([
      'hive',
    ]);
    expect(groupByServer(rows).map((group) => group.server)).toEqual(['old-1', 'open-1']);
  });
});

describe('the figures, the filters and the views', () => {
  it('counts the Tower’s four figures plus the requested', () => {
    expect(fleetStats(sampleRows())).toEqual({
      total: 6,
      running: 2,
      stopped: 1,
      problems: 1,
      requested: 1,
    });
  });

  it('filters by status, server and a search over name, card, address and server', () => {
    const rows = sampleRows();
    const all = { query: '', status: 'all', server: '' } as const;
    expect(filterRows(rows, all)).toHaveLength(6);
    expect(filterRows(rows, { ...all, status: 'stopped' }).map((row) => row.id)).toEqual([
      'akasha',
    ]);
    expect(filterRows(rows, { ...all, server: 'open-2' }).map((row) => row.id)).toEqual([
      'akasha',
      'forge',
    ]);
    expect(filterRows(rows, { ...all, query: ' AGORA.numen ' }).map((row) => row.id)).toEqual([
      'agora',
    ]);
    expect(filterRows(rows, { ...all, query: 'no-card' }).map((row) => row.id)).toEqual(['orphan']);
    expect(filterRows(rows, { ...all, query: 'circle' }).map((row) => row.id)).toEqual(['circle']);
    expect(filterRows(rows, { ...all, query: 'nothing-like-it' })).toEqual([]);
  });

  it('lists the servers and groups by them, the unplaced last', () => {
    const rows = sampleRows();
    expect(fleetServers(rows)).toEqual(['open-1', 'open-2']);
    const groups = groupByServer(rows);
    expect(groups.map((group) => group.server)).toEqual(['open-1', 'open-2', null]);
    expect(groups[0]?.rows.map((row) => row.id)).toEqual(['agora', 'orphan', 'silent']);
    expect(groups[2]?.rows.map((row) => row.id)).toEqual(['circle']);
    const [first] = groupByServer([...rows].reverse());
    expect(first?.server).toBe('open-1');
    const unplacedFirst = buildRows({
      orders: [order('zzz')],
      cards: [],
      probes: {},
      pending: [pending('aaa', 'create', 1)],
    });
    expect(groupByServer(unplacedFirst).map((group) => group.server)).toEqual(['open-1', null]);
  });
});

const WORDS: ReasonWords = {
  users: '{n} inside',
  uptime: 'up for {t}',
  engine: 'engine {c}',
  timeout: 'timeout',
  network: 'network',
  http: 'answered {s}',
  shape: 'shape',
  stopped: 'stopped',
  requested: 'requested in #{n}',
  unknown: 'unknown',
};

describe('describeStatus — the reason, in one line', () => {
  it('says who is inside, for how long and on which engine', () => {
    const rows = sampleRows();
    const by = (id: string): WorldRow => rows.find((row) => row.id === id) as WorldRow;
    expect(describeStatus(by('agora'), WORDS)).toBe('3 inside · up for 2 h · engine abc1234');
    expect(describeStatus(by('orphan'), WORDS)).toBe('0 inside · up for 1 min');
    expect(describeStatus(by('forge'), WORDS)).toBe('answered 502');
    expect(describeStatus(by('akasha'), WORDS)).toBe('stopped');
    expect(describeStatus(by('circle'), WORDS)).toBe('requested in #14');
    expect(describeStatus(by('silent'), WORDS)).toBe('unknown');
  });

  it('names a failure that is not HTTP, and an HTTP failure without a status', () => {
    const base = sampleRows().find((row) => row.id === 'forge') as WorldRow;
    expect(describeStatus({ ...base, probe: { ok: false, reason: 'timeout' } }, WORDS)).toBe(
      'timeout',
    );
    expect(describeStatus({ ...base, probe: { ok: false, reason: 'http' } }, WORDS)).toBe(
      'answered ?',
    );
    expect(describeStatus({ ...base, status: 'requested', pending: null }, WORDS)).toBe(
      'requested in #?',
    );
  });
});

describe('display helpers', () => {
  it('shortens the engine build', () => {
    expect(buildTag(DEFAULT_IMAGE)).toBe('sha-0e20453');
    expect(buildTag(`x@sha256:${'b'.repeat(64)}`)).toBe('sha256:bbbbbbbbbbbb');
    expect(buildTag('x:latest')).toBe('x:latest');
  });

  it('says how long a world has been up', () => {
    expect(formatUptime(59)).toBe('0 min');
    expect(formatUptime(45 * 60)).toBe('45 min');
    expect(formatUptime(3 * 3600 + 5)).toBe('3 h');
    expect(formatUptime(2 * 86400)).toBe('2 d');
    expect(formatUptime(2 * 86400 + 4 * 3600)).toBe('2 d 4 h');
  });

  it('fills placeholders and leaves unknown ones alone', () => {
    expect(fill('{n} of {m} — {x}', { n: 1, m: 'two' })).toBe('1 of two — {x}');
  });
});
