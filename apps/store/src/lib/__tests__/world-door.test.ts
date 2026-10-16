import { describe, expect, it, vi } from 'vitest';
import {
  AGENT_KEY_SHAPE,
  NAME_MAX,
  RENEW_AFTER_MS,
  abilityOf,
  agentIdFrom,
  askPass,
  createDoor,
  createPassKeeper,
  isAgentKey,
  nameProblem,
  newAgentCommand,
  passFromAddress,
  readAgents,
  type DoorAgent,
} from '../world-door';

const TOKEN = 'aaa.bbb_-.ccc';
const KEY = `ed25519:${'A'.repeat(43)}`;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('passFromAddress', () => {
  it('takes the pass out of the address after #', () => {
    expect(passFromAddress(`https://w.example/#pass=${TOKEN}`)).toBe(TOKEN);
  });
  it('is null for anything else', () => {
    expect(passFromAddress(undefined)).toBeNull();
    expect(passFromAddress('https://w.example/')).toBeNull();
    expect(passFromAddress('http://w.example/#pass=a.b.c')).toBeNull();
    expect(passFromAddress('https://w.example/#other=a.b.c')).toBeNull();
    expect(passFromAddress('https://w.example/#pass=notatoken')).toBeNull();
  });
});

describe('askPass', () => {
  it('posts to the pass route and returns the pass', async () => {
    const fetcher = vi.fn(async () =>
      json(200, { url: `https://w.example/#pass=${TOKEN}`, pass: true }),
    );
    expect(await askPass(fetcher, 'agora-plaza')).toBe(TOKEN);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/mundos/agora-plaza/pass',
      expect.objectContaining({ method: 'POST' }),
    );
  });
  it('is null for a guest, an odd body, an unreadable body and a network failure', async () => {
    expect(
      await askPass(async () => json(200, { url: 'https://w.example/', pass: false }), 'x'),
    ).toBeNull();
    expect(await askPass(async () => json(200, [1]), 'x')).toBeNull();
    expect(await askPass(async () => new Response('nope', { status: 503 }), 'x')).toBeNull();
    expect(
      await askPass(async () => {
        throw new Error('down');
      }, 'x'),
    ).toBeNull();
  });
});

describe('createPassKeeper', () => {
  it('holds the pass until it is old, then asks again', async () => {
    let clock = 0;
    const ask = vi.fn(async () => `t${ask.mock.calls.length}`);
    const keeper = createPassKeeper(ask, () => clock);
    expect(await keeper.get()).toBe('t1');
    clock = RENEW_AFTER_MS - 1;
    expect(await keeper.get()).toBe('t1');
    clock = RENEW_AFTER_MS;
    expect(await keeper.get()).toBe('t2');
    expect(ask).toHaveBeenCalledTimes(2);
  });
  it('renews on demand, shares one ask between simultaneous callers, forgets a missing pass', async () => {
    let answer: string | null = 'one';
    const ask = vi.fn(async () => answer);
    const keeper = createPassKeeper(ask, () => 0);
    const [a, b] = await Promise.all([keeper.get(), keeper.renew()]);
    expect([a, b]).toEqual(['one', 'one']);
    expect(ask).toHaveBeenCalledTimes(1);
    answer = null;
    expect(await keeper.renew()).toBeNull();
    answer = 'two';
    expect(await keeper.get()).toBe('two');
  });
});

describe('names, ids, key and command', () => {
  it('judges a name', () => {
    expect(nameProblem('  ')).toBe('empty');
    expect(nameProblem('x'.repeat(NAME_MAX + 1))).toBe('long');
    expect(nameProblem('Hermes "x"')).toBe('chars');
    expect(nameProblem('$(rm)')).toBe('chars');
    expect(nameProblem('Hermes Pablo')).toBeNull();
    expect(nameProblem('Ñandú 2.0')).toBeNull();
  });
  it('makes an id from a name', () => {
    expect(agentIdFrom('Hermes Pablo')).toBe('hermes-pablo');
    expect(agentIdFrom('Ñandú')).toBe('nandu');
    expect(agentIdFrom('7 dwarfs')).toBe('ia-7-dwarfs');
    expect(agentIdFrom('x'.repeat(40)).length).toBe(24);
    expect(agentIdFrom('abcdefghijklmnopqrstuvw x')).toBe('abcdefghijklmnopqrstuvw');
    expect(agentIdFrom('日本')).toBe('ia');
    expect(agentIdFrom('a')).toBe('ia');
  });
  it('builds the command', () => {
    expect(newAgentCommand('hermes', ' Hermes ')).toBe(
      'node tools/agente.ts nuevo hermes --nombre "Hermes"',
    );
  });
  it('checks the key like the engine', () => {
    expect(AGENT_KEY_SHAPE.test(KEY)).toBe(true);
    expect(isAgentKey(` ${KEY} `)).toBe(true);
    expect(isAgentKey('ed25519:short')).toBe(false);
    expect(isAgentKey(`ed25519:${'A'.repeat(44)}`)).toBe(false);
    expect(isAgentKey('')).toBe(false);
  });
});

describe('readAgents / abilityOf', () => {
  const wire = {
    id: 'a1',
    nombre: 'A',
    rol: 'Administración',
    permisos: ['build-in-worlds', 7],
    presente: true,
  };
  it('reads the list', () => {
    const agents = readAgents({
      agentes: [
        wire,
        { ...wire, id: 'a2', rol: null, permisos: ['enter-worlds'], presente: false },
      ],
    });
    expect(agents).toEqual([
      {
        id: 'a1',
        name: 'A',
        role: 'Administración',
        permissions: ['build-in-worlds'],
        present: true,
      },
      { id: 'a2', name: 'A', role: null, permissions: ['enter-worlds'], present: false },
    ]);
    const [first, second] = agents as readonly DoorAgent[];
    expect(abilityOf(first as DoorAgent)).toBe('build');
    expect(abilityOf(second as DoorAgent)).toBe('talk');
  });
  it('is null for anything else', () => {
    expect(readAgents(null)).toBeNull();
    expect(readAgents({})).toBeNull();
    expect(readAgents({ agentes: [1] })).toBeNull();
    expect(readAgents({ agentes: [{ ...wire, id: 3 }] })).toBeNull();
    expect(readAgents({ agentes: [{ ...wire, nombre: 3 }] })).toBeNull();
    expect(readAgents({ agentes: [{ ...wire, presente: 'sí' }] })).toBeNull();
    expect(readAgents({ agentes: [{ ...wire, permisos: 'x' }] })).toBeNull();
  });
});

describe('createDoor', () => {
  const keeperOf = (...tokens: (string | null)[]) => {
    const queue = [...tokens];
    const next = async () => queue.shift() ?? null;
    return { get: vi.fn(next), renew: vi.fn(next) };
  };
  const world = 'https://w.example/#pass=zzz.zzz.zzz';

  it('lists with the pass as Bearer and reads the agents', async () => {
    const fetcher = vi.fn(async () => json(200, { agentes: [] }));
    const door = createDoor({ fetch: fetcher, worldUrl: world, keeper: keeperOf('p1') });
    expect(await door.list()).toEqual({ ok: true, value: [] });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://w.example/agentes');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ authorization: 'Bearer p1' });
  });

  it('says other when a good answer is not a list', async () => {
    const door = createDoor({
      fetch: async () => json(200, { nope: 1 }),
      worldUrl: world,
      keeper: keeperOf('p'),
    });
    expect(await door.list()).toEqual({ ok: false, failure: 'other', detail: null });
  });

  it('adds with the build role only when asked', async () => {
    const fetcher = vi.fn(async () => json(201, { ok: true }));
    const door = createDoor({
      fetch: fetcher,
      worldUrl: world,
      keeper: { get: async () => 'p', renew: async () => 'p' },
    });
    expect(await door.add({ id: 'h', name: ' H ', key: ` ${KEY} `, ability: 'build' })).toEqual({
      ok: true,
      value: null,
    });
    expect(await door.add({ id: 'h', name: 'H', key: KEY, ability: 'talk' })).toEqual({
      ok: true,
      value: null,
    });
    const bodies = fetcher.mock.calls.map((c) =>
      JSON.parse((c as unknown as [string, RequestInit])[1].body as string),
    );
    expect(bodies[0]).toEqual({ id: 'h', nombre: 'H', clave: KEY, rol: 'Administración' });
    expect(bodies[1]).toEqual({ id: 'h', nombre: 'H', clave: KEY });
    const init = (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toMatchObject({ 'content-type': 'application/json' });
  });

  it('removes by id, encoded', async () => {
    const fetcher = vi.fn(async () => json(200, { ok: true }));
    const door = createDoor({ fetch: fetcher, worldUrl: world, keeper: keeperOf('p') });
    expect(await door.remove('a b')).toEqual({ ok: true, value: null });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://w.example/agentes/a%20b');
    expect(init.method).toBe('DELETE');
    expect(init.body).toBeUndefined();
  });

  it.each([
    [400, { error: 'campos', texto: 'T' }, 'invalid', 'T'],
    [403, { error: 'sin-permiso' }, 'forbidden', null],
    [404, { error: 'agentes-desactivado', texto: 'x' }, 'disabled', 'x'],
    [404, { error: 'no-hay' }, 'not-found', null],
    [409, { error: 'conflicto', texto: 'dup' }, 'duplicate', 'dup'],
    [413, { error: 'grande' }, 'too-big', null],
    [503, { error: 'arrancando' }, 'starting', null],
    [500, { error: 'servidor' }, 'other', null],
    [502, 'not json', 'other', null],
  ])('maps %i to %s', async (status, body, failure, detail) => {
    const response = typeof body === 'string' ? new Response(body, { status }) : json(status, body);
    const door = createDoor({
      fetch: async () => response,
      worldUrl: world,
      keeper: keeperOf('p'),
    });
    expect(await door.remove('a')).toEqual({ ok: false, failure, detail });
  });

  it('is unreachable when the fetch fails, there is no world address or it is not one', async () => {
    const down = async () => {
      throw new TypeError('Failed to fetch');
    };
    expect(
      await createDoor({ fetch: down, worldUrl: world, keeper: keeperOf('p') }).list(),
    ).toEqual({ ok: false, failure: 'unreachable', detail: null });
    expect(
      await createDoor({ fetch: down, worldUrl: null, keeper: keeperOf('p') }).list(),
    ).toMatchObject({ failure: 'unreachable' });
    expect(
      await createDoor({ fetch: down, worldUrl: 'not a url', keeper: keeperOf('p') }).list(),
    ).toMatchObject({ failure: 'unreachable' });
  });

  it('has no pass: no-pass, with the first or the renewed ask', async () => {
    const fetcher = vi.fn(async () => json(200, { agentes: [] }));
    expect(
      await createDoor({ fetch: fetcher, worldUrl: world, keeper: keeperOf(null) }).list(),
    ).toEqual({ ok: false, failure: 'no-pass', detail: null });
    const expired = vi.fn(async () => json(401, { error: 'caducado' }));
    expect(
      await createDoor({ fetch: expired, worldUrl: world, keeper: keeperOf('old', null) }).list(),
    ).toEqual({ ok: false, failure: 'no-pass', detail: null });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('renews once on a 401 and retries with the new pass', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) =>
      (init?.headers as Record<string, string>).authorization === 'Bearer new'
        ? json(200, { agentes: [] })
        : json(401, { error: 'caducado' }),
    );
    const keeper = keeperOf('old', 'new');
    expect(await createDoor({ fetch: fetcher, worldUrl: world, keeper }).list()).toEqual({
      ok: true,
      value: [],
    });
    expect(keeper.renew).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('asks to reload when the renewed pass is refused too', async () => {
    const fetcher = vi.fn(async () => json(401, { error: 'caducado' }));
    const keeper = keeperOf('old', 'new');
    expect(await createDoor({ fetch: fetcher, worldUrl: world, keeper }).list()).toEqual({
      ok: false,
      failure: 'expired',
      detail: null,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(keeper.renew).toHaveBeenCalledTimes(1);
  });
});
