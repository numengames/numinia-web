/**
 * The AI's body in a world (story W8): the Durable Object `Cuerpo` running
 * the vendored engine bridge against a fake world (a fake global
 * `WebSocket`, test/fake-world.ts) and a fake numinia.com (`/me` and
 * `/api/agents/pass` behind a fake `fetch`), its organization's seats and
 * body time (`Plazas`), on vitest's fake clock. It enters with the pass,
 * renews it before it ends, leaves on revocation (and revokes the OAuth
 * grant), when switched off and after 10 idle minutes, refuses a 4th body
 * in the organization, counts body-seconds per day, survives a 30-minute
 * run, and stops every timer when it leaves. The AI's token is never in a
 * log line, a note, storage or an answer.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getOAuthApi } from '@cloudflare/workers-oauth-provider';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESOURCE } from '../src/config';
import {
  BEAT_MS,
  Cuerpo,
  FIRST_PASS_MS,
  HEAR_TOOL,
  IDLE_MS,
  idleOf,
  NOTES_MAX,
  REFUSALS,
  WAIT_TOOL,
  bodyOf,
  isWorldAddress,
  worldTools,
  type BodyAnswer,
  type BodyGrant,
} from '../src/cuerpo';
import type { Env } from '../src/env';
import { MAX_BODIES, Plazas, SEAT_LEASE_MS, splitByDay } from '../src/plazas';
import { PROVIDER_OPTIONS } from '../src/provider';
import { PuenteMundo } from '../vendor/puente-mundo.mjs';
import { FakeWorld } from './fake-world';
import { MemoryKv } from './memory-kv';
import { MemoryNamespace, MemoryStorage, durableState } from './memory-durable';

/** The upstream bundle's hash (vendor/VENDOR.md). */
const VENDORED_SHA256 = '3a207576f4ba99262d35fa8b95197b6a2e9c7a4a57aabdd64bcdebaf056c41cc';
const VENDOR_END = '// ---- end of vendor header ----\n';

const STORE = 'https://numinia.com';
const ORG = 'acc_team_numen_games';
const TORRE = { id: 'torre', ws: 'wss://torre.numinia.world/ws' };
const PLAZA = { id: 'plaza', ws: 'wss://plaza.numinia.world/ws' };
const MINUTE = 60_000;

const tokenFor = (seed: string): string => `ntk_${seed.repeat(43).slice(0, 43)}`;

interface MeRecord {
  org: string;
  id: string;
  name: string;
  enabled: boolean;
  state: 'activa' | 'dormida';
  /** Absent: a store that has not shipped the setting yet. */
  hear?: boolean;
  /** Absent: a store that has not shipped the ladder yet (S19). */
  oye?: 'llamada' | 'burbuja' | 'todo';
  /** What the store sends of the AI's presence; the relay reads `quedarse_h`. */
  presence?: { quedarse_h?: unknown } | undefined;
  eligible: boolean;
  permissions: string[];
  worlds: { id: string; ws: string }[];
}

type PassMode = 'ok' | 'apagada' | 'rechazado' | 'echo' | 'down' | 'hang';
type MeMode = 'ok' | 'busy' | 'down' | 'odd';

interface Agent {
  token: string;
  me: MeRecord;
  pass: PassMode;
  meMode: MeMode;
}

/** The fake numinia.com: its agents, and every call it got. */
let agents: Map<string, Agent>;
let meCalls: { at: number; agent: string }[];
let passCalls: { at: number; agent: string; aud: string; authorization: string | null }[];
let issued: string[];
let kv: MemoryKv;
let desks: MemoryNamespace<Plazas>;
let env: Env;
let world: FakeWorld;
let consoleSpies: ReturnType<typeof vi.spyOn>[];
/** Every object a test made, its storage and every answer it gave: checked for secrets after each test. */
let bodies: { body: Cuerpo; storage: MemoryStorage }[];
let answers: unknown[];
let passCount: number;

function agent(id: string, over: Partial<MeRecord> = {}): Agent {
  const record: Agent = {
    token: tokenFor(`${id.replace(/[^A-Za-z0-9]/g, '')}Q`),
    me: {
      org: ORG,
      id,
      name: `AI ${id}`,
      enabled: true,
      state: 'activa',
      eligible: true,
      permissions: ['enter-worlds', 'build'],
      worlds: [TORRE, PLAZA],
      ...over,
    },
    pass: 'ok',
    meMode: 'ok',
  };
  agents.set(id, record);
  return record;
}

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url');

function mintPass(record: Agent, aud: string): { pass: string; exp: number } {
  passCount += 1;
  const exp = Math.floor(Date.now() / 1000) + 600;
  const pass = `${b64({ alg: 'EdDSA', typ: 'JWT' })}.${b64({ kind: 'agent', sub: record.me.id, aud, state: record.me.state, exp, n: passCount })}.c2lnbmF0dXJl`;
  issued.push(pass);
  return { pass, exp };
}

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const authorization = new Headers(init?.headers).get('Authorization');
  if (url.origin !== STORE) {
    // A world's /status (the bridge reads its name).
    return Response.json({ nombre: 'La Torre' });
  }
  if (url.pathname === '/api/agents/me') {
    const id = url.searchParams.get('agent') ?? '';
    meCalls.push({ at: Date.now(), agent: id });
    const record = agents.get(id);
    if (record === undefined || authorization !== `Bearer ${record.token}`) {
      return Response.json({ error: 'token', texto: 'no' }, { status: 401 });
    }
    if (record.meMode === 'busy') return new Response(null, { status: 429 });
    if (record.meMode === 'down') throw new TypeError('fetch failed');
    if (record.meMode === 'odd') return Response.json({ nope: true });
    return Response.json(record.me);
  }
  const body = JSON.parse(String(init?.body)) as { org: string; agent: string; aud: string };
  passCalls.push({ at: Date.now(), agent: body.agent, aud: body.aud, authorization });
  const record = agents.get(body.agent);
  if (record === undefined || authorization !== `Bearer ${record.token}`) {
    return Response.json({ error: 'token', texto: 'token no válido' }, { status: 401 });
  }
  switch (record.pass) {
    case 'apagada':
      return Response.json({ error: 'apagada', texto: 'La IA está apagada' }, { status: 403 });
    case 'rechazado':
      return Response.json({ error: 'mundo', texto: 'otro mundo' }, { status: 403 });
    case 'echo':
      // A store that misbehaves and repeats the token in its refusal.
      return Response.json({ error: 'mundo', texto: `no for ${record.token}` }, { status: 403 });
    case 'down':
      throw new TypeError('fetch failed');
    case 'hang':
      return new Promise<Response>(() => undefined);
    default:
      return Response.json(mintPass(record, body.aud));
  }
}

function newDesk(): Plazas {
  return new Plazas(durableState(), {} as Env);
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    now: new Date('2026-10-19T10:00:00Z'),
  });
  agents = new Map();
  meCalls = [];
  passCalls = [];
  issued = [];
  bodies = [];
  answers = [];
  passCount = 0;
  kv = new MemoryKv();
  desks = new MemoryNamespace(newDesk);
  env = {
    OAUTH_KV: kv.asNamespace(),
    STORE_ORIGIN: STORE,
    PLAZAS: desks.as<DurableObjectNamespace<Plazas>>(),
  };
  world = new FakeWorld();
  vi.stubGlobal('WebSocket', world.socketClass());
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
    vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(async () => {
  const secrets = [...agents.values()].map((record) => record.token);
  const seen = JSON.stringify({
    console: consoleSpies.map((spy) => spy.mock.calls),
    answers,
    storage: bodies.map(({ storage }) => [...storage.values]),
    status: await Promise.all(bodies.map(({ body }) => body.estado())),
  });
  for (const secret of [...secrets, ...retired]) expect(seen).not.toContain(secret);
  for (const pass of issued) expect(seen).not.toContain(pass);
  for (const { body } of bodies) await body.salir();
  retired = [];
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Tokens a test renewed away: still secrets. */
let retired: string[] = [];

/** A body over its own storage; its alarm rings it. */
function makeBody(storage = new MemoryStorage(), bindings: Env = env): Cuerpo {
  const body = new Cuerpo(durableState(storage), bindings);
  storage.ring = () => body.alarm();
  bodies.push({ body, storage });
  return body;
}

function propsOf(record: Agent): { accountId: string; agentId: string; token: string } {
  return { accountId: ORG, agentId: record.me.id, token: record.token };
}

async function enter(
  body: Cuerpo,
  record: Agent,
  mundo = 'torre',
  grant?: BodyGrant,
): Promise<BodyAnswer> {
  const answer = await body.entrar({
    props: propsOf(record),
    mundo,
    ...(grant === undefined ? {} : { grant }),
  });
  answers.push(answer);
  return answer;
}

async function use(body: Cuerpo, record: Agent): Promise<BodyAnswer> {
  const answer = await body.usar({ props: propsOf(record) });
  answers.push(answer);
  return answer;
}

const desk = (): Plazas => desks.getByName(ORG);

/** A grant made with the library's helpers, as `/vuelta` makes one; its ids. */
async function grantFor(record: Agent, bindings: Env = env): Promise<BodyGrant> {
  const api = getOAuthApi(PROVIDER_OPTIONS, bindings);
  const client = await api.createClient({
    redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
    clientName: 'Claude',
    tokenEndpointAuthMethod: 'none',
  });
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
    scope: 'mundos',
    state: 's',
    code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    code_challenge_method: 'S256',
    resource: RESOURCE,
  });
  const request = await api.parseAuthRequest(
    new Request(`https://mcp.numinia.com/authorize?${query}`),
  );
  const userId = `${ORG}.${record.me.id}`;
  await api.completeAuthorization({
    request,
    userId,
    metadata: {},
    scope: request.scope,
    props: { accountId: ORG, agentId: record.me.id, token: record.token },
  });
  const grants = await api.listUserGrants(userId);
  return { grantId: grants.items[0]?.id ?? '', userId };
}

async function grantsOf(grant: BodyGrant): Promise<number> {
  return (await getOAuthApi(PROVIDER_OPTIONS, env).listUserGrants(grant.userId)).items.length;
}

/** Renew the agent's token on numinia.com (Panel › Agents): the old one gets 401. */
function renewToken(record: Agent): void {
  retired.push(record.token);
  record.token = tokenFor('Renewed9');
}

async function settle(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

describe('the vendored bridge', () => {
  it('is the engine’s bundle byte for byte behind its header, and imports nothing', () => {
    const file = readFileSync(
      new URL('../vendor/puente-mundo.mjs', import.meta.url).pathname,
      'utf8',
    );
    const cut = file.indexOf(VENDOR_END);
    expect(cut).toBeGreaterThan(0);
    const upstream = file.slice(cut + VENDOR_END.length);
    expect(createHash('sha256').update(upstream).digest('hex')).toBe(VENDORED_SHA256);
    expect(file.slice(0, cut)).toContain(VENDORED_SHA256);
    expect(
      readFileSync(new URL('../vendor/VENDOR.md', import.meta.url).pathname, 'utf8'),
    ).toContain(VENDORED_SHA256);
    expect(upstream).not.toMatch(/["']node:/);
    expect(upstream).not.toMatch(/^\s*import\s/m);
  });
});

describe('Plazas, an organization’s seats and body time', () => {
  it('gives at most three seats, keeps a holder’s, and frees one on release', async () => {
    const plazas = newDesk();
    expect(MAX_BODIES).toBe(3);
    for (const id of ['a', 'b', 'c']) expect((await plazas.take(id)).ok).toBe(true);
    expect(await plazas.take('d')).toEqual({ ok: false, taken: 3 });
    expect(await plazas.take('b')).toEqual({ ok: true, taken: 3 });
    await plazas.release('b', Date.now(), Date.now());
    expect(await plazas.holders()).toEqual(['a', 'c']);
    expect((await plazas.take('d')).ok).toBe(true);
  });

  it('lets a seat lapse three minutes after its last renewal', async () => {
    const plazas = newDesk();
    for (const id of ['a', 'b', 'c']) await plazas.take(id);
    vi.advanceTimersByTime(SEAT_LEASE_MS - 1000);
    expect(await plazas.beat('a', Date.now(), Date.now())).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(await plazas.holders()).toEqual(['a']);
    expect((await plazas.take('d')).ok).toBe(true);
  });

  it('counts body time per UTC day and per agent, split at midnight', async () => {
    const plazas = newDesk();
    const before = Date.parse('2026-10-19T23:59:00Z');
    await plazas.beat('a', before, before + 2 * MINUTE);
    await plazas.release('b', before + 30_000, before + 90_000);
    await plazas.beat('a', before, before);
    expect(await plazas.days()).toEqual([
      { day: '2026-10-19', seconds: 90, agents: { a: 60, b: 30 } },
      { day: '2026-10-20', seconds: 90, agents: { a: 60, b: 30 } },
    ]);
    expect(splitByDay(before, before)).toEqual([]);
    expect(splitByDay(0, 1000)).toEqual([['1970-01-01', 1000]]);
  });
});

describe('Cuerpo, the AI’s body in one world', () => {
  it('enters with the pass numinia.com gives it for its token, over the world’s ws', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    const answer = await enter(body, ana);
    expect(answer).toMatchObject({ ok: true, world: 'torre', state: 'activa' });
    expect(meCalls).toHaveLength(1);
    expect(passCalls).toEqual([
      {
        at: Date.now(),
        agent: 'claude-de-ana',
        aud: 'torre',
        authorization: `Bearer ${ana.token}`,
      },
    ]);
    await settle(300);
    const socket = world.last();
    expect(socket?.url).toBe(TORRE.ws);
    expect(socket?.passes.map((seen) => seen.pass)).toEqual([issued[0]]);
    const status = await body.estado();
    expect(status.inside).toMatchObject({ world: 'torre', state: 'activa', connected: true });
    expect(status.notes.join('\n')).toContain('dentro de torre.numinia.world');
    expect(await desk().holders()).toEqual(['claude-de-ana']);
    const saved = bodies[0]?.storage;
    expect(saved?.alarmAt).toBe(Date.now() - 300 + BEAT_MS);
    expect(JSON.stringify([...(saved?.values ?? [])])).not.toContain('ntk_');
  });

  it('renews its pass before the 10 minutes end, on the same connection', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    await settle(7 * MINUTE);
    await use(body, ana);
    await settle(MINUTE + 1000);
    const socket = world.last();
    expect(world.sockets).toHaveLength(1);
    expect(socket?.passes.map((seen) => seen.pass)).toEqual([issued[0], issued[1]]);
    expect((socket?.passes[1]?.at ?? 0) - (socket?.passes[0]?.at ?? 0)).toBeLessThan(10 * MINUTE);
  });

  it('leaves when a renewal meets a 401, and revokes the grant it came with', async () => {
    const ana = agent('claude-de-ana');
    const grant = await grantFor(ana);
    expect(await grantsOf(grant)).toBe(1);
    const body = makeBody();
    await enter(body, ana, 'torre', grant);
    await settle(1000);
    renewToken(ana);
    await settle(8 * MINUTE);
    const status = await body.estado();
    expect(status.inside).toBeNull();
    expect(status.left?.reason).toBe('revoked');
    expect(await grantsOf(grant)).toBe(0);
    expect(await desk().holders()).toEqual([]);
    expect(world.last()?.closedBy).toBe('client');
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves within a minute of a call when /me says 401, and revokes the grant', async () => {
    const ana = agent('claude-de-ana');
    const grant = await grantFor(ana);
    const body = makeBody();
    await enter(body, ana);
    await settle(2 * MINUTE);
    renewToken(ana);
    const stale = { ...propsOf(ana), token: retired[0] ?? '' };
    expect(await body.usar({ props: stale, grant })).toMatchObject({ ok: true });
    await settle(MINUTE);
    expect((await body.estado()).left?.reason).toBe('revoked');
    expect(await grantsOf(grant)).toBe(0);
  });

  it('leaves by itself after 10 minutes without calls, counting them', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    await settle(IDLE_MS - MINUTE);
    expect((await body.estado()).inside).not.toBeNull();
    await settle(MINUTE);
    const status = await body.estado();
    expect(status.left).toEqual({ reason: 'idle', at: Date.now() });
    expect(await desk().days()).toEqual([
      { day: '2026-10-19', seconds: 600, agents: { 'claude-de-ana': 600 } },
    ]);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('refuses a fourth body in the organization until one leaves', async () => {
    const three = ['a1', 'a2', 'a3'].map((id) => agent(id));
    const made = three.map(() => makeBody());
    for (const [i, record] of three.entries()) {
      expect((await enter(made[i] as Cuerpo, record)).ok).toBe(true);
    }
    const fourth = agent('a4');
    const body = makeBody();
    expect(await enter(body, fourth)).toEqual({
      ok: false,
      reason: 'full',
      text: REFUSALS.full,
    });
    expect(passCalls.map((call) => call.agent)).toEqual(['a1', 'a2', 'a3']);
    expect(await made[1]?.salir()).toEqual({ left: true, world: 'torre', seconds: 0 });
    expect((await enter(body, fourth)).ok).toBe(true);
  });

  it('counts body-seconds per organization when it leaves', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    await settle(150_000);
    expect(await body.salir()).toEqual({ left: true, world: 'torre', seconds: 150 });
    expect(await body.salir()).toEqual({ left: false, world: null, seconds: 0 });
    expect(await desk().days()).toEqual([
      { day: '2026-10-19', seconds: 150, agents: { 'claude-de-ana': 150 } },
    ]);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stays through a 30-minute run: passes renewed, /me at most once a minute, every second counted', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    const start = Date.now();
    await enter(body, ana);
    for (let minute = 4; minute <= 28; minute += 4) {
      await settle(start + minute * MINUTE - Date.now());
      expect(await use(body, ana)).toMatchObject({ ok: true, world: 'torre' });
    }
    await settle(start + 30 * MINUTE - Date.now());
    expect((await body.estado()).inside).toMatchObject({ connected: true });
    await settle(start + 38 * MINUTE - Date.now());
    const status = await body.estado();
    expect(status.left).toEqual({ reason: 'idle', at: start + 38 * MINUTE });

    // One connection the whole time; a pass at 0, 8, 16, 24 and 32 minutes, never 10 apart.
    expect(world.sockets).toHaveLength(1);
    const passes = world.passes().map((seen) => Math.round((seen.at - start) / MINUTE));
    expect(passes).toEqual([0, 8, 16, 24, 32]);
    // /me: on entering, then at each minute's beat; never twice in a minute.
    const gaps = meCalls.slice(1).map((call, i) => call.at - (meCalls[i]?.at ?? 0));
    expect(meCalls).toHaveLength(38);
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(MINUTE);
    expect(await desk().days()).toEqual([
      { day: '2026-10-19', seconds: 38 * 60, agents: { 'claude-de-ana': 38 * 60 } },
    ]);
    expect(world.last()?.frames).toBeGreaterThan(38 * 60 * 19);
    await settle();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not enter switched off, without anyone answering for it or without permission', async () => {
    const off = agent('off', { enabled: false });
    const orphan = agent('orphan', { eligible: false });
    const roleless = agent('roleless', { permissions: [] });
    for (const [record, reason] of [
      [off, 'apagada'],
      [orphan, 'sin-responsable'],
      [roleless, 'sin-permiso'],
    ] as const) {
      expect(await enter(makeBody(), record)).toEqual({
        ok: false,
        reason,
        text: REFUSALS[reason],
      });
    }
    expect(passCalls).toEqual([]);
    expect(await desk().holders()).toEqual([]);
  });

  it('enters asleep (dormida) and stays: the bridge keeps to what its pass allows', async () => {
    const sleepy = agent('sleepy', { state: 'dormida' });
    const body = makeBody();
    expect(await enter(body, sleepy)).toMatchObject({ ok: true, state: 'dormida' });
    await settle(300);
    expect((await body.estado()).inside?.state).toBe('dormida');
  });

  it('leaves when switched off: at the pass (numinia.com says «apagada») or at /me after a call', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    ana.pass = 'apagada';
    expect(await enter(body, ana)).toMatchObject({ ok: false, reason: 'apagada' });
    expect(await desk().holders()).toEqual([]);

    ana.pass = 'ok';
    await settle(MINUTE);
    await enter(body, ana);
    ana.pass = 'apagada';
    await use(body, ana);
    await settle(8 * MINUTE);
    expect((await body.estado()).left?.reason).toBe('apagada');

    ana.pass = 'ok';
    const other = makeBody();
    await enter(other, ana);
    await use(other, ana);
    ana.me.enabled = false;
    await settle(MINUTE);
    expect((await other.estado()).left?.reason).toBe('apagada');
  });

  it('leaves when its world is gone from /me, or the world puts it out (4003)', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    await use(body, ana);
    ana.me.worlds = [PLAZA];
    await settle(MINUTE);
    expect((await body.estado()).left?.reason).toBe('world-gone');

    ana.me.worlds = [TORRE];
    await settle(MINUTE);
    expect(await enter(body, ana)).toMatchObject({ ok: true });
    await settle(300);
    world.last()?.shut(4003, 'fuera');
    await settle(MINUTE);
    expect((await body.estado()).left?.reason).toBe('world-closed');
  });

  it('keeps the body when /me is busy, down or odd after a call', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    for (const mode of ['busy', 'down', 'odd'] as const) {
      ana.meMode = mode;
      await use(body, ana);
      await settle(MINUTE);
      expect((await body.estado()).inside).not.toBeNull();
    }
  });

  describe('hearing, per AI', () => {
    type Heard = { oir: (name: string, text: string, channel: string) => void; oidas: unknown[] };
    const bridgeOf = (body: Cuerpo): Heard =>
      (body as unknown as { inside: { bridge: Heard } }).inside.bridge;
    const useTool = async (body: Cuerpo, record: Agent, name: string) => {
      const answer = await body.usar({
        props: propsOf(record),
        tool: { name, arguments: {} },
      });
      return answer.ok ? answer.result : undefined;
    };

    it('does not hear, nor keep what the bridge heard, when /me says hear=false or says nothing', async () => {
      for (const over of [{ hear: false }, {}]) {
        const ana = agent('claude-de-ana', over);
        const body = makeBody();
        await enter(body, ana);
        bridgeOf(body).oir('Marta', 'hola', 'cerca');
        expect(await useTool(body, ana, 'oir')).toMatchObject({
          isError: true,
          text: 'This body has no tool «oir».',
        });
        await settle(MINUTE);
        expect(bridgeOf(body).oidas).toEqual([]);
        await body.salir();
      }
    });

    it('lists «oir» and returns what was heard when /me says hear=true, and keeps it between beats', async () => {
      const ana = agent('claude-de-ana', { hear: true });
      const body = makeBody();
      await enter(body, ana);
      bridgeOf(body).oir('Marta', 'hola torre', 'cerca');
      const heard = await useTool(body, ana, 'oir');
      expect(heard?.isError).toBe(false);
      expect(heard?.text).toContain('hola torre');
      await settle(MINUTE);
      expect(bridgeOf(body).oidas).toHaveLength(1);
      expect((await body.estado()).inside).not.toBeNull();
    });

    it('stops hearing at the next /me when the setting goes true → false, and drops the buffer', async () => {
      const ana = agent('claude-de-ana', { hear: true });
      const body = makeBody();
      await enter(body, ana);
      bridgeOf(body).oir('Marta', 'secreto', 'cerca');
      ana.me.hear = false;
      // The /me cache lasts a minute: after it, the call sees the new setting.
      await settle(MINUTE);
      expect(bridgeOf(body).oidas).toEqual([]);
      expect(await useTool(body, ana, 'oir')).toMatchObject({ isError: true });
      // And turning it back on is picked up by the next call after a minute.
      ana.me.hear = true;
      await settle(MINUTE);
      expect(await useTool(body, ana, 'oir')).toMatchObject({ isError: false });
    });

    it('re-reads the setting on a call, within the once-a-minute /me', async () => {
      const ana = agent('claude-de-ana', { hear: true });
      const body = makeBody();
      await enter(body, ana);
      ana.me.hear = false;
      expect(await useTool(body, ana, 'oir')).toMatchObject({ isError: false });
      expect(meCalls).toHaveLength(1);
      bridgeOf(body).oir('Marta', 'hola', 'cerca');
      vi.advanceTimersByTime(MINUTE);
      expect(await useTool(body, ana, 'oir')).toMatchObject({ isError: true });
      expect(bridgeOf(body).oidas).toEqual([]);
    });

    it('hears nothing when /me cannot be read (down, busy or odd), without leaving', async () => {
      for (const mode of ['down', 'busy', 'odd'] as const) {
        const ana = agent('claude-de-ana', { hear: true });
        const body = makeBody();
        await enter(body, ana);
        bridgeOf(body).oir('Marta', 'hola', 'cerca');
        ana.meMode = mode;
        await settle(MINUTE);
        expect(bridgeOf(body).oidas).toEqual([]);
        expect((await body.estado()).inside).not.toBeNull();
        await body.salir();
      }
    });
  });

  describe('calls and the bubble, per rung of hearing (D-083)', () => {
    type Mailbox = { entradas: unknown[]; dentro: Map<number, unknown> };
    const mailbox = (body: Cuerpo): Mailbox =>
      (body as unknown as { inside: { bridge: { buzon: Mailbox } } }).inside.bridge.buzon;
    const call = {
      ia: 1,
      quien: 7,
      nombre: 'Marta',
      texto: 'ven a la torre',
      modo: 'nombre',
      t: 100,
    };
    const enters = { ia: 1, quien: 8, nombre: 'Leo', distanciaDm: 30, esIA: false };
    const useTool = async (body: Cuerpo, record: Agent, name: string, args = {}) => {
      const answer = await body.usar({ props: propsOf(record), tool: { name, arguments: args } });
      return answer.ok ? answer.result : undefined;
    };
    /** An AI inside a world that has calls, bubbles, gestures and attention. */
    const inside = async (record: Agent): Promise<Cuerpo> => {
      world.features = ['chat', 'objetos', 'llamar', 'burbuja', 'gestos', 'ia'];
      const body = makeBody();
      await enter(body, record);
      await settle(100);
      return body;
    };
    const socketOf = () => {
      const socket = world.sockets[0];
      if (socket === undefined) throw new Error('no socket');
      return socket;
    };

    it.each(['llamada', 'burbuja', 'todo'] as const)(
      'brings a call addressed to it at «%s», and waits for it',
      async (oye) => {
        const ana = agent('claude-de-ana', { oye });
        const body = await inside(ana);
        const waiting = useTool(body, ana, 'esperar_llamada', { segundos: 20 });
        await settle(5_000);
        socketOf().emit('llamada', call);
        const heard = await waiting;
        expect(heard?.isError).toBe(false);
        expect(heard?.text).toContain('ven a la torre');
        expect(heard?.text).toContain('Marta');
        // It was read: «llamadas» has nothing more.
        const more = await useTool(body, ana, 'llamadas');
        expect(more?.text).toContain('No tienes llamadas sin leer');
      },
    );

    it('gives back empty after the 25 s of the bridge, and the world sees it greet', async () => {
      const ana = agent('claude-de-ana', { oye: 'llamada' });
      const body = await inside(ana);
      const waiting = useTool(body, ana, 'esperar_llamada');
      await settle(100);
      await settle(25_000);
      const nothing = await waiting;
      expect(nothing?.isError).toBe(false);
      expect(nothing?.text).toContain('Nadie te ha llamado');
      const greeted = await useTool(body, ana, 'gesto', { tipo: 'saludar' });
      expect(greeted?.isError).toBe(false);
      expect(socketOf().intents.map((sent) => sent.name)).toContain('hacer');
    });

    it('wakes for someone entering its bubble only from «burbuja» up', async () => {
      const woken = async (oye: 'llamada' | 'burbuja' | 'todo'): Promise<string | undefined> => {
        const ana = agent('claude-de-ana', { oye });
        const body = await inside(ana);
        const waiting = useTool(body, ana, 'esperar_llamada', { segundos: 3 });
        await settle(1_000);
        socketOf().emit('entraEnBurbuja', enters);
        await settle(3_000);
        const answer = await waiting;
        const inBubble = mailbox(body).dentro.size;
        await body.salir();
        world.sockets.length = 0;
        return `${inBubble}|${answer?.text.includes('Leo') === true}`;
      };
      expect(await woken('llamada')).toBe('0|false');
      expect(await woken('burbuja')).toBe('1|true');
      expect(await woken('todo')).toBe('1|true');
    });

    it('drops the bubble entries it already had when the ladder goes down to «llamada»', async () => {
      const ana = agent('claude-de-ana', { oye: 'burbuja' });
      const body = await inside(ana);
      socketOf().emit('entraEnBurbuja', enters);
      await settle();
      expect(mailbox(body).entradas).toHaveLength(1);
      ana.me.oye = 'llamada';
      await settle(MINUTE);
      expect(mailbox(body).entradas).toEqual([]);
      expect(mailbox(body).dentro.size).toBe(0);
    });

    it('falls to «llamada» when /me cannot be read, and keeps its calls', async () => {
      const ana = agent('claude-de-ana', { oye: 'todo' });
      const body = await inside(ana);
      socketOf().emit('llamada', call);
      ana.meMode = 'down';
      await settle(MINUTE);
      const heard = await useTool(body, ana, 'llamadas');
      expect(heard?.text).toContain('ven a la torre');
      expect(await useTool(body, ana, 'oir')).toMatchObject({ isError: true });
    });
  });

  describe('«quedarse», the hours an AI stays without use (D-082)', () => {
    const HOUR = 60 * MINUTE;

    it.each([1, 4])(
      'stays %i h without calls, holding its seat and counting body time',
      async (hours) => {
        const ana = agent('claude-de-ana', { presence: { quedarse_h: hours } });
        const body = makeBody();
        await enter(body, ana);
        await settle(hours * HOUR - MINUTE);
        expect((await body.estado()).inside).not.toBeNull();
        expect(await desk().holders()).toEqual(['claude-de-ana']);
        await settle(MINUTE);
        expect((await body.estado()).left).toEqual({ reason: 'idle', at: Date.now() });
        // A day may be split at midnight: the seconds add up to the whole stay.
        const counted = (await desk().days()).reduce((sum, day) => sum + day.seconds, 0);
        expect(counted).toBe(hours * 3600);
      },
    );

    it('is ten minutes, or the hours when they are more', () => {
      expect([0, 1, 4, 24].map((hours) => idleOf(hours) / HOUR)).toEqual([1 / 6, 1, 4, 24]);
    });

    it('leaves after 10 minutes when it is not set, or the number is not 1, 4 or 24', async () => {
      for (const presence of [
        undefined,
        { quedarse_h: 0 },
        { quedarse_h: 2 },
        { quedarse_h: 'x' },
      ]) {
        const ana = agent('claude-de-ana', { presence });
        const body = makeBody();
        await enter(body, ana);
        await settle(IDLE_MS);
        expect((await body.estado()).left).toMatchObject({ reason: 'idle' });
        await body.salir();
      }
    });

    it('goes back to 10 minutes when /me can no longer confirm the stay', async () => {
      const ana = agent('claude-de-ana', { presence: { quedarse_h: 4 } });
      const body = makeBody();
      await enter(body, ana);
      ana.meMode = 'down';
      await settle(IDLE_MS + MINUTE);
      expect((await body.estado()).left).toMatchObject({ reason: 'idle' });
    });
  });

  it('asks /me at most once a minute, even when entrar comes sooner', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana, 'torre');
    await settle(30_000);
    expect(await enter(body, ana, 'plaza')).toMatchObject({ ok: true, world: 'plaza' });
    expect(meCalls).toHaveLength(1);
    expect((await body.estado()).left?.reason).toBe('other-world');
    await settle(20_000);
    await enter(body, ana, 'plaza');
    expect(meCalls).toHaveLength(1);
    await settle(5 * MINUTE);
    const gaps = meCalls.slice(1).map((call, i) => call.at - (meCalls[i]?.at ?? 0));
    expect(meCalls).toHaveLength(6);
    for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(MINUTE);
  });

  it('answers «already in» for the same world and refuses another AI’s request', async () => {
    const ana = agent('claude-de-ana');
    const luis = agent('luis');
    const body = makeBody();
    await enter(body, ana);
    expect(await enter(body, ana)).toMatchObject({ ok: true, text: 'You are already in «torre».' });
    expect(world.sockets).toHaveLength(1);
    const refusal = { ok: false, reason: 'other-ai', text: REFUSALS['other-ai'] };
    expect(await enter(body, luis)).toEqual(refusal);
    expect(await use(body, luis)).toEqual(refusal);
  });

  it('leaves the world it is in when /me says 401 or that it is switched off on a new entrar', async () => {
    const ana = agent('claude-de-ana');
    const grant = await grantFor(ana);
    const storage = new MemoryStorage();
    const body = makeBody(storage);
    await enter(body, ana, 'torre', grant);
    // Its alarm runs late (workerd gives no promise of the minute): /me is a minute old.
    await storage.deleteAlarm();
    await settle(MINUTE);
    ana.me.enabled = false;
    expect(await enter(body, ana, 'plaza')).toMatchObject({ ok: false, reason: 'apagada' });
    expect((await body.estado()).left?.reason).toBe('apagada');

    ana.me.enabled = true;
    await settle(MINUTE);
    await enter(body, ana, 'torre', grant);
    await storage.deleteAlarm();
    await settle(MINUTE);
    renewToken(ana);
    const stale = { ...propsOf(ana), token: retired[0] ?? '' };
    expect(await body.entrar({ props: stale, mundo: 'plaza' })).toMatchObject({
      ok: false,
      reason: 'revoked',
    });
    expect((await body.estado()).left?.reason).toBe('revoked');
    expect(await grantsOf(grant)).toBe(0);
  });

  it('keeps its grant into another world: a pass refused with 401 there revokes it', async () => {
    const ana = agent('claude-de-ana');
    const grant = await grantFor(ana);
    const body = makeBody();
    await enter(body, ana, 'torre', grant);
    await settle(MINUTE);
    const old = ana.token;
    renewToken(ana);
    // The /me of this minute still stands (asked with the same token): the pass is what says 401.
    expect(
      await body.entrar({ props: { ...propsOf(ana), token: old }, mundo: 'plaza' }),
    ).toMatchObject({
      ok: false,
      reason: 'revoked',
    });
    await settle();
    expect(await grantsOf(grant)).toBe(0);
  });

  it('revokes nothing when /me says 401 before entering without a grant, and the grant when given', async () => {
    const ana = agent('claude-de-ana');
    const grant = await grantFor(ana);
    renewToken(ana);
    const stale = { ...propsOf(ana), token: retired[0] ?? '' };
    const body = makeBody();
    expect(await body.entrar({ props: stale, mundo: 'torre' })).toMatchObject({
      reason: 'revoked',
    });
    expect(await grantsOf(grant)).toBe(1);
    await settle(MINUTE);
    expect(await body.entrar({ props: stale, mundo: 'torre', grant })).toMatchObject({
      reason: 'revoked',
    });
    expect(await grantsOf(grant)).toBe(0);
  });

  it('refuses what it cannot do, in words the AI can act on', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    const refusal = (reason: keyof typeof REFUSALS) => ({
      ok: false,
      reason,
      text: REFUSALS[reason],
    });
    expect(await body.entrar(null)).toEqual(refusal('input'));
    expect(
      await body.entrar({ props: { ...propsOf(ana), token: 'ntk_short' }, mundo: 't' }),
    ).toEqual(refusal('input'));
    expect(
      await body.entrar({
        props: propsOf(ana),
        mundo: 'torre',
        grant: { grantId: 'g', userId: 'someone.else' },
      }),
    ).toEqual(refusal('input'));
    expect(await body.usar({})).toEqual(refusal('input'));
    expect(await use(body, ana)).toEqual(refusal('not-inside'));
    expect(
      await enter(makeBody(new MemoryStorage(), { ...env, STORE_ORIGIN: 'http://x' }), ana),
    ).toEqual(refusal('unconfigured'));
    const { PLAZAS: _unbound, ...noSeats } = env;
    expect(await enter(makeBody(new MemoryStorage(), noSeats), ana)).toEqual(
      refusal('unconfigured'),
    );
    expect(await enter(body, ana, 'nowhere')).toEqual(refusal('no-world'));
    for (const [mode, reason] of [
      ['busy', 'busy'],
      ['down', 'down'],
      ['odd', 'odd'],
    ] as const) {
      ana.meMode = mode;
      await settle(MINUTE);
      expect(await enter(body, ana)).toEqual(refusal(reason));
    }
    expect(meCalls.length).toBeGreaterThan(0);
    expect(passCalls).toEqual([]);
  });

  it('refuses when numinia.com gives no pass, and frees the seat', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    for (const [mode, reason] of [
      ['rechazado', 'refused'],
      ['down', 'down'],
    ] as const) {
      ana.pass = mode;
      expect(await enter(body, ana)).toMatchObject({ ok: false, reason });
      expect((await body.estado()).left?.reason).toBe(reason);
    }
    ana.pass = 'hang';
    const waiting = enter(body, ana);
    await settle(FIRST_PASS_MS);
    expect(await waiting).toMatchObject({ ok: false, reason: 'down' });
    expect(await desk().holders()).toEqual([]);
  });

  it('refuses a world whose address is not ws:// or wss://, and frees the seat', async () => {
    const ana = agent('claude-de-ana', {
      worlds: [{ id: 'torre', ws: 'https://torre.numinia.world' }],
    });
    expect(await enter(makeBody(), ana)).toMatchObject({ ok: false, reason: 'odd' });
    expect(await desk().holders()).toEqual([]);
    expect(isWorldAddress('ws://localhost:8080/ws')).toBe(true);
    expect(isWorldAddress('not an address')).toBe(false);
    expect(isWorldAddress('wss://')).toBe(false);
  });

  it('renews with the newest token a call brings', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    renewToken(ana);
    await use(body, ana);
    await settle(8 * MINUTE + 1000);
    expect(passCalls.at(-1)?.authorization).toBe(`Bearer ${ana.token}`);
    expect((await body.estado()).inside).not.toBeNull();
  });

  it('leaves when its seat lapsed and others took all of them', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    await desk().release('claude-de-ana', Date.now(), Date.now());
    for (const id of ['x', 'y', 'z']) await desk().take(id);
    await settle(MINUTE);
    expect((await body.estado()).left?.reason).toBe('seat-lost');
  });

  it('keeps the body when the desk does not answer a beat, and still leaves when it fails a release', async () => {
    const ana = agent('claude-de-ana');
    const body = makeBody();
    await enter(body, ana);
    const plazas = desk();
    const beat = vi.spyOn(plazas, 'beat').mockRejectedValueOnce(new Error('desk down'));
    await settle(MINUTE);
    expect(beat).toHaveBeenCalledOnce();
    expect((await body.estado()).inside).not.toBeNull();
    vi.spyOn(plazas, 'release').mockRejectedValueOnce(new Error('desk down'));
    expect(await body.salir()).toMatchObject({ left: true });
  });

  it('after an eviction, the new instance’s alarm frees the seat the lost body held', async () => {
    const ana = agent('claude-de-ana');
    const storage = new MemoryStorage();
    await enter(makeBody(storage), ana);
    expect(await desk().holders()).toEqual(['claude-de-ana']);
    const fresh = makeBody(storage);
    await fresh.alarm();
    expect((await fresh.estado()).left?.reason).toBe('evicted');
    expect(await desk().holders()).toEqual([]);
    await fresh.alarm();
    expect(storage.values.size).toBe(0);

    await storage.put('body', { org: ORG, agent: 'gone', world: 'torre', since: 0, counted: 0 });
    vi.spyOn(desk(), 'release').mockRejectedValueOnce(new Error('desk down'));
    await fresh.alarm();
    expect(storage.values.size).toBe(0);
  });

  it('still leaves when the OAuth store fails the revocation', async () => {
    const ana = agent('claude-de-ana');
    const grant = await grantFor(ana);
    const broken = {
      ...env,
      OAUTH_KV: {
        get: () => Promise.reject(new Error('kv down')),
        list: () => Promise.reject(new Error('kv down')),
        delete: () => Promise.reject(new Error('kv down')),
      } as unknown as KVNamespace,
    };
    const body = makeBody(new MemoryStorage(), broken);
    await enter(body, ana, 'torre', grant);
    renewToken(ana);
    await settle(8 * MINUTE + 1000);
    expect((await body.estado()).left?.reason).toBe('revoked');
  });

  it('keeps no more than its last notes, the token scrubbed', async () => {
    const ana = agent('claude-de-ana');
    world.answers = false;
    const body = makeBody();
    await enter(body, ana);
    await settle(10 * MINUTE);
    const { notes, left } = await body.estado();
    expect(left?.reason).toBe('idle');
    expect(notes).toHaveLength(NOTES_MAX);
    expect(notes.join('\n')).toContain('no llego al mundo');

    world.answers = true;
    ana.pass = 'echo';
    expect(await enter(body, ana)).toMatchObject({ ok: false, reason: 'refused' });
    const last = (await body.estado()).notes.at(-1) ?? '';
    expect(last).toContain('«token»');
    expect(last).not.toContain('ntk_');
  });

  it('serves the world tools with «oir» only when the AI’s own setting is on', () => {
    const bridge = new PuenteMundo({
      url: TORRE.ws,
      id: 'claude-de-ana',
      pedirPase: () => Promise.resolve({ ok: false, motivo: 'red', texto: '' }),
    });
    const names = worldTools(bridge, 'llamada').map((tool) => tool.name);
    expect(names).toEqual([
      'mirar',
      'decir',
      'ir_a',
      'colocar',
      'mover',
      'borrar',
      'deshacer',
      'llamadas',
      'esperar_llamada',
      'gesto',
    ]);
    // A call reaches it at every rung; the bubble is part of the wait only from «burbuja» up.
    const waits = (hearing: 'llamada' | 'burbuja' | 'todo'): string | undefined =>
      worldTools(bridge, hearing).find((tool) => tool.name === WAIT_TOOL)?.description;
    expect(waits('llamada')).not.toContain('burbuja');
    expect(waits('burbuja')).toContain('entre en tu burbuja');
    expect(waits('todo')).toBe(waits('burbuja'));
    expect(names).not.toContain(HEAR_TOOL);
    expect(worldTools(bridge, 'todo').map((tool) => tool.name)).toContain(HEAR_TOOL);
  });

  it('is one object per AI, named <organization>.<agent>', () => {
    const named = new MemoryNamespace((name) => name);
    expect(bodyOf({ ...env, CUERPO: named.as<DurableObjectNamespace<Cuerpo>>() }, ORG, 'ana')).toBe(
      `${ORG}.ana`,
    );
    expect(bodyOf(env, ORG, 'ana')).toBeNull();
  });
});
