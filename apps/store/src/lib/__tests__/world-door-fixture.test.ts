import { describe, expect, it } from 'vitest';
import { createDoor } from '../world-door';
import { FIXTURE_ARRIVES_AFTER, FIXTURE_PASS, createFixtureDoor } from '../world-door-fixture';

const KEY = `ed25519:${'B'.repeat(43)}`;
const WORLD = 'https://w.example/';

const call = async (
  door: ReturnType<typeof createFixtureDoor>,
  path: string,
  init: { method?: string; body?: unknown; auth?: string | null } = {},
) => {
  const headers: Record<string, string> = {};
  if (init.auth !== null) headers.authorization = init.auth ?? `Bearer ${FIXTURE_PASS}`;
  const response = await door(`${WORLD}${path}`, {
    method: init.method ?? 'GET',
    headers,
    ...(init.body === undefined
      ? {}
      : { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) }),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};

describe('the fixture door', () => {
  it('refuses a missing or wrong pass with 401', async () => {
    const door = createFixtureDoor();
    expect((await call(door, 'agentes', { auth: null })).status).toBe(401);
    expect((await call(door, 'agentes', { auth: 'Bearer nope' })).status).toBe(401);
  });

  it('adds, lists with presence arriving, and removes', async () => {
    const door = createFixtureDoor();
    expect((await call(door, 'agentes')).body).toEqual({ agentes: [] });
    const added = await call(door, 'agentes', {
      method: 'POST',
      body: { id: 'hermes', nombre: 'Hermes', clave: KEY, rol: 'Administración' },
    });
    expect(added.status).toBe(201);
    await call(door, 'agentes', {
      method: 'POST',
      body: { id: 'mira', nombre: 'Mira', clave: KEY },
    });
    let listed = (await call(door, 'agentes')).body.agentes as {
      id: string;
      permisos: string[];
      presente: boolean;
    }[];
    expect(listed.map((a) => a.presente)).toEqual([false, false]);
    for (let i = 1; i < FIXTURE_ARRIVES_AFTER; i += 1)
      listed = (await call(door, 'agentes')).body.agentes as typeof listed;
    expect(listed.map((a) => a.presente)).toEqual([true, true]);
    expect(listed[0]?.permisos).toContain('build-in-worlds');
    expect(listed[1]?.permisos).not.toContain('build-in-worlds');
    expect((await call(door, 'agentes/hermes', { method: 'DELETE' })).status).toBe(200);
    expect(((await call(door, 'agentes')).body.agentes as unknown[]).length).toBe(1);
  });

  it('refuses what the engine refuses', async () => {
    const door = createFixtureDoor();
    const post = (body: unknown) => call(door, 'agentes', { method: 'POST', body });
    expect((await post('{nope')).body.error).toBe('json');
    expect((await call(door, 'agentes', { method: 'POST', body: '' })).status).toBe(400);
    expect((await post(null)).body.error).toBe('campos');
    expect((await post({ id: 1, nombre: 'a', clave: KEY })).body.error).toBe('campos');
    expect((await post({ id: 'Bad Id', nombre: 'a', clave: KEY })).status).toBe(400);
    expect((await post({ id: 'ok', nombre: 'a', clave: 'ed25519:x' })).status).toBe(400);
    expect((await post({ id: 'ok', nombre: 'a', clave: KEY, rol: 'Moderación' })).status).toBe(400);
    expect((await post({ id: 'ok', nombre: 'a', clave: KEY })).status).toBe(201);
    expect((await post({ id: 'ok', nombre: 'a', clave: KEY })).status).toBe(409);
    expect((await call(door, 'agentes/zzz', { method: 'DELETE' })).status).toBe(404);
    expect((await call(door, 'agentes', { method: 'PUT' })).status).toBe(405);
  });

  it('works through createDoor', async () => {
    const fixture = createFixtureDoor();
    const door = createDoor({
      fetch: fixture,
      worldUrl: WORLD,
      keeper: { get: async () => FIXTURE_PASS, renew: async () => FIXTURE_PASS },
    });
    expect(await door.add({ id: 'ana', name: 'Ana', key: KEY, ability: 'build' })).toEqual({
      ok: true,
      value: null,
    });
    expect(await door.add({ id: 'ana', name: 'Ana', key: KEY, ability: 'build' })).toMatchObject({
      failure: 'duplicate',
    });
    const listed = await door.list();
    expect(listed).toMatchObject({
      ok: true,
      value: [{ id: 'ana', role: 'Administración', present: false }],
    });
  });
});
