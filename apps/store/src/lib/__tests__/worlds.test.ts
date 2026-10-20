/**
 * The worlds room's model: the order rules (mirroring the fleet machine's
 * own checks), the wizard's draft, the rows the room shows (order × phase ×
 * card × probe), the filters and the views' grouping.
 */

import { describe, expect, it } from 'vitest';
import type { DoorPhase } from '../fleet';
import type { SummaCard } from '../summa';
import {
  DEFAULT_IMAGE,
  DEFAULT_SERVER,
  ENGINES,
  ENGINE_NAMES,
  FLEET_MACHINES,
  WORLD_ZONES,
  addressOwner,
  applyNames,
  applySettling,
  SETTLE_MS,
  engineVersion,
  settleMemory,
  buildRows,
  buildTag,
  compareDns,
  dnsFromDesk,
  readDeskLook,
  roomWritesDns,
  describeStatus,
  draftToOrder,
  emptyDraft,
  engineOf,
  engineTag,
  fill,
  filterRows,
  fleetHomes,
  fleetServers,
  fleetStats,
  formatUptime,
  groupByServer,
  importMachines,
  inHouseZone,
  joinDomain,
  listedRows,
  machineChoices,
  machineEngines,
  machineHost,
  nameOwner,
  orderProblems,
  ownTitle,
  parseOrder,
  placeAllowed,
  problemFields,
  proposeName,
  readDohAnswer,
  readEngineRelease,
  readProbe,
  renderOrder,
  rowPlace,
  slot,
  slugify,
  fleetEngine,
  updateFor,
  worldCards,
  worldUrl,
  type EngineRelease,
  type Probe,
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

  it('refuses the depot’s reserved ids, the index and the machine’s front service', () => {
    for (const id of ['index', 'caddy']) {
      expect(orderProblems(json({ ...VALID, id, card: id }), id)).toEqual(['id']);
    }
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

  it('joins a name and a zone into the address, lowercased', () => {
    expect(joinDomain(' TRG-2026 ', 'numinia.com')).toBe('trg-2026.numinia.com');
    expect(joinDomain('trg', 'numen.games')).toBe('trg.numen.games');
    expect(joinDomain('  ', 'numinia.com')).toBe('');
  });

  it('offers numinia.com first and open-1 as the fleet’s first machine', () => {
    expect(WORLD_ZONES).toEqual(['numinia.com', 'numen.games']);
    expect(FLEET_MACHINES[0]?.alias).toBe(DEFAULT_SERVER);
    expect(FLEET_MACHINES.every((machine) => !/^[0-9.]+$/.test(machine.host))).toBe(true);
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

const order = (id: string, extra: Partial<WorldOrder> = {}): WorldOrder => ({
  ...VALID,
  id,
  card: id,
  domain: `${id}.numen.games`,
  ...extra,
});

function sampleRows(): WorldRow[] {
  return buildRows({
    orders: [
      order('agora'),
      order('forge', { server: 'open-2' }),
      order('akasha', { state: 'stopped', server: 'open-2' }),
      order('orphan', { card: 'no-card' }),
      order('silent'),
      order('circle'),
    ],
    phases: { circle: 'creating', forge: 'running' },
    leaving: [{ id: 'gone', server: 'open-2', domain: 'gone.numen.games' }],
    cards: [
      { slug: 'agora', title: 'Agora', cover: '/a.webp' },
      { slug: 'forge', title: 'Forge', cover: null },
      { slug: 'akasha', title: 'Akasha', cover: '/k.webp' },
      { slug: 'circle', title: 'Circle', cover: '/c.webp' },
      { slug: 'gone', title: 'Gone', cover: '/g.webp' },
    ],
    probes: {
      agora: { ok: true, users: 3, uptime: 7200, commit: 'abc1234' },
      forge: { ok: false, reason: 'http', status: 502 },
      orphan: { ok: true, users: 0, uptime: 60, commit: null },
    },
  });
}

describe('buildRows — what was asked for, crossed with what answers', () => {
  it('derives every status from the machine’s phase and the probe, and keeps the card and cover', () => {
    const rows = sampleRows();
    const by = (id: string): WorldRow => rows.find((row) => row.id === id) as WorldRow;
    expect(rows.map((row) => row.id)).toEqual([
      'agora',
      'akasha',
      'circle',
      'forge',
      'gone',
      'orphan',
      'silent',
    ]);
    expect(by('agora')).toMatchObject({
      status: 'running',
      phase: 'running',
      title: 'Agora',
      cover: '/a.webp',
      missingCard: false,
      place: { server: 'open-1', domain: 'agora.numen.games' },
    });
    expect(by('forge')).toMatchObject({ status: 'unreachable' });
    expect(by('akasha')).toMatchObject({ status: 'stopped', phase: 'stopped', probe: null });
    expect(by('orphan')).toMatchObject({
      status: 'running',
      title: 'orphan',
      cover: null,
      missingCard: true,
    });
    expect(by('silent')).toMatchObject({ status: 'unknown', missingCard: true });
    expect(by('circle')).toMatchObject({
      status: 'changing',
      phase: 'creating',
      title: 'Circle',
      cover: '/c.webp',
    });
    expect(by('gone')).toMatchObject({
      status: 'changing',
      phase: 'deleting',
      order: null,
      legacy: null,
      title: 'Gone',
      cover: '/g.webp',
      place: { server: 'open-2', domain: 'gone.numen.games' },
    });
  });

  it('shows a world being deleted once, even when its address is no longer known', () => {
    const rows = buildRows({
      orders: [order('kept')],
      leaving: [
        { id: 'kept', server: 'open-1', domain: null },
        { id: 'lost', server: 'open-1', domain: null },
        { id: 'lost', server: 'open-1', domain: null },
      ],
      cards: [],
      probes: {},
    });
    expect(rows.map((row) => row.id)).toEqual(['kept', 'lost']);
    expect(rows[1]).toMatchObject({ title: 'lost', cover: null, place: null, status: 'changing' });
    // A world whose place is no longer known names no server.
    expect(fleetServers(rows)).toEqual(['open-1']);
  });

  it('shows a world on its way back from its zip, with how much of its zip has arrived', () => {
    const rows = buildRows({
      orders: [order('kept')],
      leaving: [{ id: 'leaving', server: 'open-1', domain: null }],
      arriving: [
        {
          id: 'copia',
          server: 'open-1',
          domain: 'copia.numinia.com',
          phase: 'uploading',
          upload: { bytes: 412, of: 1200 },
        },
        {
          id: 'tower',
          server: 'open-2',
          domain: 'tower.numinia.com',
          phase: 'importing',
          upload: null,
        },
        // A name the fleet already shows, as a world or one leaving, is shown once.
        {
          id: 'kept',
          server: 'open-1',
          domain: 'kept.numinia.com',
          phase: 'importing',
          upload: null,
        },
        {
          id: 'leaving',
          server: 'open-1',
          domain: 'x.numinia.com',
          phase: 'uploading',
          upload: null,
        },
      ],
      cards: [{ slug: 'tower', title: 'The Tower', cover: '/t.webp' }],
      probes: {},
    });
    expect(rows.map((row) => row.id)).toEqual(['copia', 'kept', 'leaving', 'tower']);
    const by = (id: string): WorldRow => rows.find((row) => row.id === id) as WorldRow;
    expect(by('copia')).toEqual({
      id: 'copia',
      title: 'copia',
      cover: null,
      missingCard: false,
      status: 'changing',
      probe: null,
      phase: 'uploading',
      order: null,
      legacy: null,
      place: { server: 'open-1', domain: 'copia.numinia.com' },
      upload: { bytes: 412, of: 1200 },
    });
    expect(by('tower')).toMatchObject({
      title: 'The Tower',
      cover: '/t.webp',
      phase: 'importing',
      upload: null,
    });
    expect(by('kept')).toMatchObject({ phase: 'running', upload: null });
    expect(by('leaving')).toMatchObject({ phase: 'deleting' });
    // Nothing to count yet: a world from its zip is changing until it lands, stopped.
    expect(fleetStats(rows)).toMatchObject({ total: 4 });
  });

  it('breaks title ties by id', () => {
    const rows = buildRows({
      orders: [order('b'), order('a')],
      cards: [
        { slug: 'a', title: 'Same', cover: null },
        { slug: 'b', title: 'Same', cover: null },
      ],
      probes: {},
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
      phase: null,
      missingCard: false,
      legacy: hive,
    });
    expect(by('quiet')).toMatchObject({ title: 'quiet', cover: null, status: 'unreachable' });
  });

  it('drops a legacy world once a world of the fleet holds its id or its address', () => {
    const ids = legacyRows().map((row) => row.id);
    expect(ids).not.toContain('moved');
    expect(ids.filter((id) => id === 'agora')).toHaveLength(1);
  });

  it('names and pictures a world without a card by its own page; the card wins', () => {
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
    const [row] = buildRows({ orders: [], cards: [], probes: {}, legacy: [hive] });
    expect(row).toMatchObject({ status: 'unknown', title: 'hive', probe: null });
  });

  it('names a world by its id when its page carries only the engine’s default title', () => {
    expect(ownTitle('World')).toBeNull();
    expect(ownTitle(' world ')).toBeNull();
    expect(ownTitle('   ')).toBeNull();
    expect(ownTitle(null)).toBeNull();
    expect(ownTitle(undefined)).toBeNull();
    expect(ownTitle(' The Hive ')).toBe('The Hive');
    const rows = buildRows({
      orders: [order('plain')],
      cards: [],
      probes: {},
      legacy: [{ id: 'sandbox', domain: 'sandbox.numen.games', server: 'old-1' }],
      faces: {
        plain: { title: 'World', image: null },
        sandbox: { title: 'World', image: null },
      },
    });
    expect(rows.map((row) => row.title).sort()).toEqual(['plain', 'sandbox']);
  });

  it('places, filters and groups a legacy world by its server', () => {
    const rows = legacyRows();
    const hiveRow = rows.find((row) => row.id === 'hive') as WorldRow;
    expect(rowPlace(hiveRow)).toEqual({ server: 'old-1', domain: 'hive.numinia.com' });
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

describe('the place: machine, address and whether it is free', () => {
  const agora = { ...VALID, id: 'agora', card: 'agora', domain: 'agora.numinia.com' };
  const forge = {
    ...VALID,
    id: 'forge',
    card: 'forge',
    server: 'open-2',
    domain: 'forge.numen.games',
  };
  const rows = buildRows({
    orders: [
      agora,
      forge,
      { ...agora, id: 'again', card: 'again', domain: 'again.numinia.com' },
      { ...agora, id: 'gone', card: 'gone', domain: 'gone.numinia.com' },
    ],
    phases: { gone: 'deleting' },
    leaving: [
      { id: 'circle', server: 'open-1', domain: null },
      { id: 'old', server: 'open-1', domain: 'old.numinia.com' },
    ],
    cards: [],
    probes: {},
    legacy: [{ id: 'vic', domain: 'vic.numinia.com', server: 'vps-legacy' }],
  });

  it('keeps an address to one name under a house zone', () => {
    expect(inHouseZone('p1.numinia.com')).toBe(true);
    expect(inHouseZone('p1.numen.games')).toBe(true);
    expect(inHouseZone('a.b.numinia.com')).toBe(false);
    expect(inHouseZone('numinia.com')).toBe(false);
    expect(inHouseZone('.numinia.com')).toBe(false);
    expect(inHouseZone('-p1.numinia.com')).toBe(false);
    expect(inHouseZone('P1.numinia.com')).toBe(false);
    expect(inHouseZone('p1.evil.example')).toBe(false);
    expect(inHouseZone('')).toBe(false);
  });

  it('refuses a draft whose address the machine would refuse, naming the field once', () => {
    const outside = draftToOrder({ ...emptyDraft(), id: 'x', card: 'x', domain: 'x.example.com' });
    expect('problems' in outside && outside.problems).toEqual(['domain']);
    const broken = draftToOrder({ ...emptyDraft(), id: 'x', card: 'x', domain: 'not a host' });
    expect('problems' in broken && broken.problems.filter((p) => p === 'domain')).toHaveLength(1);
  });

  it('offers only the machines whose door answers, in the fleet’s order', () => {
    const open = { open: true, reason: null, heartbeat: null, listens: [], recipe: null };
    expect(
      machineChoices([
        { alias: 'open-1', ...open, imports: null },
        {
          alias: 'open-2',
          open: false,
          reason: 'timeout',
          heartbeat: null,
          listens: [],
          recipe: null,
          imports: null,
        },
        { alias: 'open-3', ...open, imports: null },
      ]),
    ).toEqual(['open-1', 'open-3']);
    expect(machineChoices([])).toEqual([]);
    expect(machineHost('open-1')).toBe('vps-39c7f315.vps.ovh.net');
    expect(machineHost('open-9')).toBeNull();
  });

  it('brings worlds back from their zip only to machines whose door says it takes them', () => {
    const open = { open: true, reason: null, heartbeat: null, listens: [], recipe: null };
    expect(
      importMachines([
        { alias: 'open-1', ...open, imports: { zipMaxBytes: 2147483648 } },
        // A machine older than the import says nothing: never offered.
        { alias: 'open-2', ...open, imports: null },
        { alias: 'open-3', ...open, open: false, imports: { zipMaxBytes: 1024 } },
        { alias: 'open-4', ...open, imports: { zipMaxBytes: 1024 } },
      ]),
    ).toEqual([
      { alias: 'open-1', zipMaxBytes: 2147483648, engines: ['numinia-hyperfy2'] },
      { alias: 'open-4', zipMaxBytes: 1024, engines: ['numinia-hyperfy2'] },
    ]);
    // With the engines its door names: a Numinia Engine zip goes only where that engine runs.
    expect(
      importMachines([
        {
          alias: 'bronte-xs-ca-003',
          ...open,
          imports: { zipMaxBytes: 1024 },
          engines: ['numinia-hyperfy2', 'numinia-engine'],
        },
      ]),
    ).toEqual([
      {
        alias: 'bronte-xs-ca-003',
        zipMaxBytes: 1024,
        engines: ['numinia-hyperfy2', 'numinia-engine'],
      },
    ]);
    expect(importMachines([])).toEqual([]);
  });

  it('makes a name of any text, as an order’s id must be', () => {
    expect(slugify('Plaza Mayor — Copia (2)')).toBe('plaza-mayor-copia-2');
    expect(slugify('Ágora del Café')).toBe('agora-del-cafe');
    expect(slugify('--pablofm__20261012.zip--')).toBe('pablofm-20261012-zip');
    expect(slugify('世界')).toBe('');
    expect(slugify(`${'a'.repeat(39)}-b`)).toBe('a'.repeat(39));
    expect(slugify('x'.repeat(50))).toHaveLength(40);
  });

  it('proposes a world’s own name for its zip, or the first free one after it', () => {
    // agora exists, gone is being deleted, vic's address belongs to a legacy world.
    expect(proposeName('Plaza Nueva', rows, 'numinia.com')).toBe('plaza-nueva');
    expect(proposeName('agora', rows, 'numinia.com')).toBe('agora-2');
    expect(proposeName('gone', rows, 'numinia.com')).toBe('gone-2');
    expect(proposeName('vic', rows, 'numinia.com')).toBe('vic-2');
    expect(proposeName('vic', rows, 'numen.games')).toBe('vic');
    expect(proposeName('index', rows, 'numinia.com')).toBe('index-2');
    expect(proposeName('世界', rows, 'numinia.com')).toBe('world');
    const crowded = buildRows({
      orders: ['plaza', 'plaza-2', 'plaza-3'].map((id) => ({
        id,
        card: id,
        state: 'running' as const,
        server: 'open-1',
        domain: `${id}.numinia.com`,
        image: 'ghcr.io/numengames/numinia-hyperfy2:sha-0e20453',
        limits: { memory: '2g', cpus: '1.5', maxUploadMb: 50 },
      })),
      cards: [],
      probes: {},
    });
    expect(proposeName('Plaza', crowded, 'numinia.com')).toBe('plaza-4');
  });

  it('knows which world already answers at an address, and which one is still leaving it', () => {
    expect(addressOwner(' Agora.numinia.com ', rows)).toEqual({
      id: 'agora',
      legacy: false,
      leaving: false,
    });
    expect(addressOwner('vic.numinia.com', rows)).toEqual({
      id: 'vic',
      legacy: true,
      leaving: false,
    });
    // A deleted world keeps its address until its machine has removed it.
    expect(addressOwner('gone.numinia.com', rows)).toEqual({
      id: 'gone',
      legacy: false,
      leaving: true,
    });
    expect(addressOwner('old.numinia.com', rows)).toEqual({
      id: 'old',
      legacy: false,
      leaving: true,
    });
    expect(addressOwner('free.numinia.com', rows)).toBeNull();
    expect(addressOwner('', rows)).toBeNull();
  });

  it('knows which name is taken among the fleet’s worlds, and which one is being freed', () => {
    expect(nameOwner(' Agora ', rows)).toEqual({ id: 'agora', leaving: false });
    expect(nameOwner('gone', rows)).toEqual({ id: 'gone', leaving: true });
    expect(nameOwner('circle', rows)).toEqual({ id: 'circle', leaving: true });
    // A legacy world's name is free: the old machine reads no book.
    expect(nameOwner('vic', rows)).toBeNull();
    expect(nameOwner('new-one', rows)).toBeNull();
    expect(nameOwner('  ', rows)).toBeNull();
  });

  it('lists every world but those being deleted', () => {
    const ids = listedRows(rows).map((row) => row.id);
    expect(ids).toEqual(expect.arrayContaining(['agora', 'forge', 'again', 'vic']));
    expect(ids).not.toContain('gone');
    expect(ids).not.toContain('circle');
    expect(ids).not.toContain('old');
  });

  it('overrides a row’s title with the house’s own name, leaving the rest untouched', () => {
    const named = applyNames(rows, new Map([['agora', 'La Reserva Nueva']]));
    expect(named.find((row) => row.id === 'agora')?.title).toBe('La Reserva Nueva');
    expect(named.find((row) => row.id === 'forge')?.title).toBe(
      rows.find((row) => row.id === 'forge')?.title,
    );
    expect(applyNames(rows, null)).toEqual(rows);
    expect(applyNames(rows, new Map())).toEqual(rows);
  });

  it('reads a DNS-over-HTTPS answer: A records only, no such name is empty, a failure is null', () => {
    expect(readDohAnswer(null)).toBeNull();
    expect(readDohAnswer({ Status: 2 })).toBeNull();
    expect(readDohAnswer({ Status: 3 })).toEqual([]);
    expect(
      readDohAnswer({
        Status: 0,
        Answer: [
          { type: 5, data: 'target.example.' },
          { type: 1, data: '192.0.2.1' },
          { type: 1, data: 7 },
          'junk',
        ],
      }),
    ).toEqual(['192.0.2.1']);
  });

  it('compares where an address points with the machine', () => {
    expect(compareDns([], ['192.0.2.1'])).toBe('none');
    expect(compareDns(['192.0.2.1'], [])).toBe('unknown');
    expect(compareDns(['192.0.2.9', '192.0.2.1'], ['192.0.2.1'])).toBe('machine');
    expect(compareDns(['198.51.100.7'], ['192.0.2.1'])).toBe('elsewhere');
  });

  it('lets the wizard go on only with a free address, or a legacy world being moved', () => {
    const taken = { legacy: false };
    const legacy = { legacy: true };
    expect(placeAllowed('a.b.numinia.com', null, 'machine')).toBe(false);
    expect(placeAllowed('p1.numinia.com', null, 'checking')).toBe(false);
    expect(placeAllowed('p1.numinia.com', taken, 'machine')).toBe(false);
    expect(placeAllowed('p1.numinia.com', legacy, 'elsewhere')).toBe(true);
    expect(placeAllowed('p1.numinia.com', null, 'elsewhere')).toBe(false);
    expect(placeAllowed('p1.numinia.com', null, 'machine')).toBe(true);
    expect(placeAllowed('p1.numinia.com', null, 'none')).toBe(true);
    expect(placeAllowed('p1.numinia.com', null, 'unknown')).toBe(true);
  });
});

describe('the figures, the filters and the views', () => {
  it('counts the Tower’s four figures plus the worlds changing', () => {
    expect(fleetStats(sampleRows())).toEqual({
      total: 7,
      running: 2,
      stopped: 1,
      problems: 1,
      changing: 2,
    });
  });

  it('filters by status, server and a search over name, card, address and server', () => {
    const rows = sampleRows();
    const all = { query: '', status: 'all', server: '' } as const;
    expect(filterRows(rows, all)).toHaveLength(7);
    expect(filterRows(rows, { ...all, status: 'stopped' }).map((row) => row.id)).toEqual([
      'akasha',
    ]);
    expect(filterRows(rows, { ...all, server: 'open-2' }).map((row) => row.id)).toEqual([
      'akasha',
      'forge',
      'gone',
    ]);
    expect(filterRows(rows, { ...all, query: ' AGORA.numen ' }).map((row) => row.id)).toEqual([
      'agora',
    ]);
    expect(filterRows(rows, { ...all, query: 'no-card' }).map((row) => row.id)).toEqual(['orphan']);
    expect(filterRows(rows, { ...all, query: 'circle' }).map((row) => row.id)).toEqual(['circle']);
    expect(filterRows(rows, { ...all, query: 'nothing-like-it' })).toEqual([]);
  });

  it('filters by organization, and lists every organization some world stands in', () => {
    const rows = sampleRows();
    const all = { query: '', status: 'all', server: '' } as const;
    const homes = new Map([
      ['agora', { worldId: 'agora', accountId: 'acc-reset', accountName: 'Reset', placedAt: '' }],
      ['circle', { worldId: 'circle', accountId: 'acc-reset', accountName: 'Reset', placedAt: '' }],
      [
        'forge',
        {
          worldId: 'forge',
          accountId: 'acc-ai',
          accountName: 'Active Inference',
          placedAt: '',
        },
      ],
    ]);
    expect(filterRows(rows, { ...all, home: 'acc-reset' }, homes).map((row) => row.id)).toEqual([
      'agora',
      'circle',
    ]);
    expect(filterRows(rows, { ...all, home: 'acc-ai' }, homes).map((row) => row.id)).toEqual([
      'forge',
    ]);
    // No homes read yet, or no filter chosen: every row passes.
    expect(filterRows(rows, { ...all, home: 'acc-reset' }, null)).toEqual([]);
    expect(filterRows(rows, all, homes)).toHaveLength(7);
    expect(fleetHomes(rows, null)).toEqual([]);
    expect(fleetHomes(rows, homes)).toEqual([
      { accountId: 'acc-ai', accountName: 'Active Inference' },
      { accountId: 'acc-reset', accountName: 'Reset' },
    ]);
  });

  it('lists the servers and groups by them, the unplaced last', () => {
    const rows = sampleRows();
    expect(fleetServers(rows)).toEqual(['open-1', 'open-2']);
    const groups = groupByServer(rows);
    expect(groups.map((group) => group.server)).toEqual(['open-1', 'open-2']);
    expect(groups[0]?.rows.map((row) => row.id)).toEqual(['agora', 'circle', 'orphan', 'silent']);
    const [first] = groupByServer([...rows].reverse());
    expect(first?.server).toBe('open-1');
    const unplacedFirst = buildRows({
      orders: [order('zzz')],
      leaving: [{ id: 'aaa', server: 'open-1', domain: null }],
      cards: [],
      probes: {},
    });
    expect(groupByServer(unplacedFirst).map((group) => group.server)).toEqual(['open-1', null]);
    expect(groupByServer([...unplacedFirst].reverse()).map((group) => group.server)).toEqual([
      'open-1',
      null,
    ]);
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
  creating: 'creating',
  stopping: 'stopping',
  starting: 'starting',
  deleting: 'deleting',
  uploading: 'uploading',
  importing: 'importing',
  updating: 'updating',
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
    expect(describeStatus(by('circle'), WORDS)).toBe('creating');
    expect(describeStatus(by('gone'), WORDS)).toBe('deleting');
    expect(describeStatus(by('silent'), WORDS)).toBe('unknown');
  });

  it('says what its machine is doing to a world on its way', () => {
    const base = sampleRows().find((row) => row.id === 'circle') as WorldRow;
    expect(describeStatus({ ...base, phase: 'stopping' }, WORDS)).toBe('stopping');
    expect(describeStatus({ ...base, phase: 'starting' }, WORDS)).toBe('starting');
    expect(describeStatus({ ...base, phase: 'uploading' }, WORDS)).toBe('uploading');
    expect(describeStatus({ ...base, phase: 'importing' }, WORDS)).toBe('importing');
    expect(describeStatus({ ...base, phase: 'updating' }, WORDS)).toBe('updating');
  });

  it('names a failure that is not HTTP, and an HTTP failure without a status', () => {
    const base = sampleRows().find((row) => row.id === 'forge') as WorldRow;
    expect(describeStatus({ ...base, probe: { ok: false, reason: 'timeout' } }, WORDS)).toBe(
      'timeout',
    );
    expect(describeStatus({ ...base, probe: { ok: false, reason: 'http' } }, WORDS)).toBe(
      'answered ?',
    );
  });
});

describe('display helpers', () => {
  it('links a world by its address, encoding anything that is not a host', () => {
    expect(worldUrl('agora.numinia.com')).toBe('https://agora.numinia.com/');
    expect(worldUrl('x"><img src=y>')).toBe('https://x%22%3E%3Cimg%20src%3Dy%3E/');
    expect(worldUrl('javascript:alert(1)')).toBe('https://javascript%3Aalert(1)/');
  });

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

  it('cuts a sentence around its slot, wherever the language puts it', () => {
    expect(slot('mostró el código de {w}', 'w')).toEqual(['mostró el código de ', '']);
    expect(slot('{w} のコードを表示', 'w')).toEqual(['', ' のコードを表示']);
    // A sentence without the slot takes the value after it.
    expect(slot('creó', 'w')).toEqual(['creó ', '']);
  });
});

const ENGINE_OLD = 'ghcr.io/numengames/numinia-engine:sha-c57dbb7cc4c51b0834184f1dd47b311e47fde234';
const RELEASE: EngineRelease = {
  image: `ghcr.io/numengames/numinia-engine:sha-${'d'.repeat(40)}`,
  commit: 'd'.repeat(40),
  build: 'ddddddd 2026-10-16',
  digest: `sha256:${'e'.repeat(64)}`,
};

describe('the Numinia Engine beside Hyperfy', () => {
  it('lists the machine that runs the engine, with its provider host name', () => {
    expect(FLEET_MACHINES.map((machine) => machine.alias)).toEqual(['open-1', 'bronte-xs-ca-003']);
    expect(machineHost('bronte-xs-ca-003')).toBe('vps-1e2f105f.vps.ovh.ca');
  });

  it('knows an engine by its image’s repository in the house’s registry', () => {
    expect(ENGINES).toEqual(['numinia-hyperfy2', 'numinia-engine']);
    expect(engineOf(DEFAULT_IMAGE)).toBe('numinia-hyperfy2');
    expect(engineOf(ENGINE_OLD)).toBe('numinia-engine');
    expect(engineOf(`ghcr.io/numengames/numinia-engine@sha256:${'a'.repeat(64)}`)).toBe(
      'numinia-engine',
    );
    for (const image of [
      'ghcr.io/numengames/numinia-world:sha-0123456',
      'ghcr.io/numengames/numinia-engine-dev:sha-0123456',
      'ghcr.io/someone/numinia-engine:sha-0123456',
      'ghcr.io/numengames/numinia-engine:latest',
      '',
    ]) {
      expect(engineOf(image)).toBeNull();
    }
    expect(ENGINE_NAMES['numinia-engine']).toBe('Numinia Engine');
    expect(engineTag(ENGINE_OLD)).toBe('Numinia Engine · sha-c57dbb7');
    expect(engineTag(DEFAULT_IMAGE)).toBe('Hyperfy · sha-0e20453');
    // An image of no known engine runs as Hyperfy on its machine.
    expect(engineTag('ghcr.io/numengames/numinia-world:sha-0123456')).toBe('Hyperfy · sha-0123456');
  });

  it('offers the engines a door names, or Hyperfy alone when it names none', () => {
    expect(machineEngines(undefined)).toEqual(['numinia-hyperfy2']);
    expect(machineEngines({ engines: null })).toEqual(['numinia-hyperfy2']);
    expect(machineEngines({})).toEqual(['numinia-hyperfy2']);
    expect(machineEngines({ engines: ['numinia-hyperfy2', 'numinia-engine'] })).toEqual([
      'numinia-hyperfy2',
      'numinia-engine',
    ]);
  });

  it('orders a new world only with an engine a machine runs (unknown-engine otherwise)', () => {
    const base = { ...emptyDraft(), id: 'nuevo', card: 'nuevo', domain: 'nuevo.numinia.com' };
    expect(draftToOrder({ ...base, image: ENGINE_OLD })).toMatchObject({
      order: { image: ENGINE_OLD },
    });
    const other = draftToOrder({ ...base, image: 'ghcr.io/numengames/numinia-world:sha-0123456' });
    expect('problems' in other && other.problems).toEqual(['image']);
    const bad = draftToOrder({ ...base, image: 'nope' });
    expect('problems' in bad && bad.problems.filter((p) => p === 'image')).toHaveLength(1);
  });

  it('reads the engine’s own /status: how many are in, never who', () => {
    expect(
      readProbe({ uptime: 5400, conectados: 3, commitHash: 'c'.repeat(40), version: 'x' }),
    ).toEqual({ ok: true, users: 3, uptime: 5400, commit: 'ccccccc' });
    expect(readProbe({ uptime: 1, conectados: 0 })).toEqual({
      ok: true,
      users: 0,
      uptime: 1,
      commit: null,
    });
    for (const conectados of [-1, 1.5, '3', null]) {
      expect(readProbe({ uptime: 1, conectados })).toEqual({ ok: false, reason: 'shape' });
    }
    expect(readProbe({ uptime: '1', conectados: 2 })).toEqual({ ok: false, reason: 'shape' });
  });

  it('believes a release’s imagen.json only when every field has its exact shape', () => {
    expect(readEngineRelease(RELEASE)).toEqual(RELEASE);
    expect(readEngineRelease({ ...RELEASE, extra: 1 })).toEqual(RELEASE);
    const broken: unknown[] = [
      null,
      [],
      'x',
      { ...RELEASE, image: 5 },
      { ...RELEASE, commit: 5 },
      // The image must be the one built from its commit.
      { ...RELEASE, commit: 'f'.repeat(40) },
      { ...RELEASE, image: `ghcr.io/numengames/numinia-hyperfy2:sha-${'d'.repeat(40)}` },
      {
        ...RELEASE,
        image: `ghcr.io/numengames/numinia-engine:sha-${'d'.repeat(7)}`,
        commit: 'd'.repeat(7),
      },
      { ...RELEASE, build: '' },
      { ...RELEASE, build: 'a\nb' },
      { ...RELEASE, build: 7 },
      { ...RELEASE, digest: 'sha256:xyz' },
      { ...RELEASE, digest: null },
    ];
    for (const body of broken) expect(readEngineRelease(body)).toBeNull();
  });

  it('offers «Actualizar» for a world of the engine on an older build, where its door takes updates', () => {
    const world: WorldOrder = { ...VALID, server: 'bronte-xs-ca-003', image: ENGINE_OLD };
    const door = { alias: 'bronte-xs-ca-003', open: true, updates: true };
    expect(updateFor(world, [door], RELEASE)).toBe(RELEASE.image);
    expect(updateFor(world, [door], null)).toBeNull();
    expect(updateFor({ ...world, image: RELEASE.image }, [door], RELEASE)).toBeNull();
    // Hyperfy worlds are not offered one by the room.
    expect(updateFor({ ...world, image: DEFAULT_IMAGE }, [door], RELEASE)).toBeNull();
    expect(updateFor(world, [{ ...door, updates: false }], RELEASE)).toBeNull();
    expect(updateFor(world, [{ alias: 'bronte-xs-ca-003', open: true }], RELEASE)).toBeNull();
    expect(updateFor(world, [{ ...door, open: false }], RELEASE)).toBeNull();
    expect(updateFor(world, [], RELEASE)).toBeNull();
    const rows = buildRows({
      orders: [world, { ...VALID, id: 'plaza', card: 'plaza' }],
      cards: [],
      probes: {},
      machines: [door],
      engine: RELEASE,
    });
    expect(rows.map((row) => [row.id, row.update])).toEqual([
      ['example-world', RELEASE.image],
      ['plaza', null],
    ]);
    const quiet = buildRows({ orders: [world], cards: [], probes: {} });
    expect(quiet[0]?.update).toBeNull();
  });
});

describe('the DNS desk’s answer, as the wizard reads it', () => {
  const IP = '192.0.2.20';
  it('makes a record nobody has, keeps or moves its own, and stops at one by hand elsewhere', () => {
    expect(dnsFromDesk({ record: 'none', ips: [], machineIp: IP })).toBe('create');
    expect(dnsFromDesk({ record: 'fleet', ips: [IP], machineIp: IP })).toBe('machine');
    expect(dnsFromDesk({ record: 'fleet', ips: ['192.0.2.10'], machineIp: IP })).toBe('move');
    expect(dnsFromDesk({ record: 'hand', ips: [IP], machineIp: IP })).toBe('machine');
    expect(dnsFromDesk({ record: 'hand', ips: ['198.51.100.7'], machineIp: IP })).toBe('elsewhere');
    expect(dnsFromDesk({ record: 'hand', ips: ['198.51.100.7'], machineIp: null })).toBe('unknown');
    expect(dnsFromDesk({ record: 'hand', ips: [], machineIp: IP })).toBe('elsewhere');
  });

  it('writes only what it said it would', () => {
    expect(roomWritesDns('create')).toBe(true);
    expect(roomWritesDns('move')).toBe(true);
    for (const other of ['machine', 'elsewhere', 'none', 'unknown', 'checking'] as const) {
      expect(roomWritesDns(other)).toBe(false);
    }
  });

  it('reads the route’s answer, and nothing that is not one', () => {
    expect(readDeskLook({ ok: true, record: 'fleet', ips: [IP], machineIp: IP })).toEqual({
      record: 'fleet',
      ips: [IP],
      machineIp: IP,
    });
    expect(readDeskLook({ ok: true, record: 'none', ips: [], machineIp: null })?.record).toBe(
      'none',
    );
    for (const bad of [
      null,
      { ok: false, problem: 'domain' },
      { ok: true, record: 'other', ips: [], machineIp: null },
      { ok: true, record: 'none', ips: [3], machineIp: null },
      { ok: true, record: 'none', ips: 'x', machineIp: null },
      { ok: true, record: 'none', ips: [], machineIp: 7 },
    ]) {
      expect(readDeskLook(bad)).toBeNull();
    }
  });
});

describe('fleetEngine: the newest build and who is behind it', () => {
  const door = (alias: string, updates?: boolean) => ({
    alias,
    open: true,
    ...(updates === undefined ? {} : { updates }),
  });
  const row = (id: string, server: string, image: string) => ({
    id,
    order: { ...VALID, id, server, image },
  });
  const old = row('atrium', 'bronte', ENGINE_OLD);
  const fresh = row('lantern', 'bronte', RELEASE.image);
  const hyper = row('agora', 'open-1', DEFAULT_IMAGE);

  it('says the whole fleet is up to date', () => {
    expect(fleetEngine([fresh], [door('bronte', true)], RELEASE)).toEqual({
      current: RELEASE,
      laggards: [],
      total: 1,
      otherEngine: 0,
    });
  });

  it('lists the one world behind, and whether one signature moves it', () => {
    const got = fleetEngine(
      [old, fresh, row('third', 'bronte', ENGINE_OLD)],
      [door('bronte', true)],
      RELEASE,
    );
    expect(got.laggards.map((l) => l.id)).toEqual(['atrium', 'third']);
    expect(got.laggards[0]).toEqual({
      id: 'atrium',
      server: 'bronte',
      build: 'sha-c57dbb7',
      canUpdate: true,
    });
    expect(got.total).toBe(3);
  });

  it('counts Hyperfy worlds apart, never as behind', () => {
    const got = fleetEngine([old, hyper, hyper], [door('bronte', true)], RELEASE);
    expect(got.otherEngine).toBe(2);
    expect(got.total).toBe(1);
    expect(got.laggards).toHaveLength(1);
  });

  it('keeps a world behind on a door without updates, but offers no button', () => {
    for (const machines of [[door('bronte', false)], [door('bronte')], []]) {
      const got = fleetEngine([old], machines, RELEASE);
      expect(got.laggards).toEqual([
        { id: 'atrium', server: 'bronte', build: 'sha-c57dbb7', canUpdate: false },
      ]);
    }
  });

  it('names nobody behind while there is no release', () => {
    expect(fleetEngine([old, hyper], [door('bronte', true)], null)).toEqual({
      current: null,
      laggards: [],
      total: 1,
      otherEngine: 1,
    });
  });

  it('ignores a world being deleted (no order)', () => {
    expect(fleetEngine([{ id: 'gone', order: null }], [], RELEASE).total).toBe(0);
  });
});

describe('the engine version a person reads', () => {
  it('says the newest build with its date, and any other build by its short tag', () => {
    expect(engineVersion(RELEASE.image, RELEASE)).toBe('Numinia Engine · ddddddd 2026-10-16');
    expect(engineVersion(ENGINE_OLD, RELEASE)).toBe('Numinia Engine · sha-c57dbb7');
    expect(engineVersion(RELEASE.image, null)).toBe(`Numinia Engine · sha-ddddddd`);
    expect(engineVersion(DEFAULT_IMAGE, RELEASE)).toBe('Hyperfy · sha-0e20453');
  });
});

describe('a world that is booting is not «not answering»', () => {
  const rowsAt = (phase: DoorPhase, probe: Probe | undefined): WorldRow[] =>
    buildRows({
      orders: [order('p2')],
      phases: { p2: phase },
      cards: [],
      probes: probe === undefined ? {} : { p2: probe },
    });
  const DOWN: Probe = { ok: false, reason: 'timeout' };
  const UP: Probe = { ok: true, users: 0, uptime: 5, commit: null };

  it('remembers a world it saw being created and keeps it booting while it does not answer', () => {
    const creating = rowsAt('creating', undefined);
    const memory = settleMemory(creating, {}, 1_000);
    expect(memory).toEqual({ p2: { phase: 'creating', since: 1_000 } });
    // The machine now says «running», the world does not answer yet.
    const silent = rowsAt('running', DOWN);
    expect(silent[0]?.status).toBe('unreachable');
    const shown = applySettling(silent, settleMemory(silent, memory, 61_000));
    expect(shown[0]?.status).toBe('changing');
    expect(shown[0]?.phase).toBe('creating');
    expect(describeStatus(shown[0] as WorldRow, WORDS)).toBe('creating');
  });

  it('keeps the moment it first saw the boot, and forgets it once the world answers or is stopped', () => {
    const memory = settleMemory(rowsAt('starting', undefined), {}, 1_000);
    expect(settleMemory(rowsAt('starting', undefined), memory, 9_000)).toEqual(memory);
    expect(settleMemory(rowsAt('running', UP), memory, 9_000)).toEqual({});
    expect(settleMemory(rowsAt('stopped', undefined), memory, 9_000)).toEqual({});
    expect(settleMemory([], memory, 9_000)).toEqual({});
  });

  it('gives up after five minutes: then it is honestly not answering', () => {
    const memory = settleMemory(rowsAt('creating', undefined), {}, 0);
    const silent = rowsAt('running', DOWN);
    expect(settleMemory(silent, memory, SETTLE_MS - 1)).toEqual(memory);
    const late = settleMemory(silent, memory, SETTLE_MS);
    expect(late).toEqual({});
    expect(applySettling(silent, late)[0]?.status).toBe('unreachable');
  });

  it('never hides a world nobody saw booting, nor one that answers', () => {
    const silent = rowsAt('running', DOWN);
    expect(applySettling(silent, {})[0]?.status).toBe('unreachable');
    const memory = { p2: { phase: 'starting' as const, since: 0 } };
    expect(applySettling(rowsAt('running', UP), memory)[0]?.status).toBe('running');
    // A legacy world has no phase to remember.
    const legacy = buildRows({
      orders: [],
      legacy: [{ id: 'old', domain: 'old.numen.games', server: 'vps' }],
      cards: [],
      probes: { old: DOWN },
    });
    expect(settleMemory(legacy, {}, 0)).toEqual({});
  });
});
