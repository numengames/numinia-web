/**
 * «IAs de organización» at the store's door (lib/agents-source.ts), in the
 * fixture desk wired into the account desk (lib/accounts-fixture.ts) and
 * through a bound till (lib/accounts-source.ts `boundAccounts`): the panel's
 * contract for GET, POST, PATCH and DELETE on /api/saldo/agents.
 */

import { AGENT_WORLDS_MAX, DEFAULT_AGENT_PRESENCE } from '@numinia/domain';
import { describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import type { AccountDesk, Asker } from '../accounts';
import { accountsFrom, boundAccounts } from '../accounts-source';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { PRESENCE_PROBLEMS } from '../agents';
import { answerAgentWrite, answerAgents } from '../agents-source';
import { b64urlEncode } from '../world-pass';

const NOW = new Date('2026-10-17T10:00:00.000Z');
const ME = `0x${'ab'.repeat(20)}`;
const HOUSE = `0x${'99'.repeat(20)}`;
const NUMEN = 'acc_t_2e2dd18c880ba974da1512dc7cde2431';
const INSTITUTE = 'acc_team_active_inference';
const INSTITUTE_OWNER = '0x00000000000000000000000000000000000000c3';
const INSTITUTE_PLAIN = '0x00000000000000000000000000000000000000d4';
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const seed = deskSeed as unknown as AccountsSeed;
const quiet = vi.fn();

const KEY = (n: number): string => `ed25519:${b64urlEncode(new Uint8Array(32).fill(n))}`;
const BOT = { accountId: NUMEN, id: 'hermes-1', name: 'Hermes', publicKey: KEY(7) };

const fresh = (): AccountDesk => createAccountsFixtureDesk(seed, () => NOW);
const asker = (wallet = ME, house = false): Asker => ({ wallet, house });
const url = (query: string): URL => new URL(`https://numinia.test/api/saldo/agents?${query}`);
const send = (method: string, body?: unknown, headers: Record<string, string> = {}): Request =>
  new Request('https://numinia.test/api/saldo/agents', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
const del = (query: string): Request =>
  new Request(`https://numinia.test/api/saldo/agents?${query}`, { method: 'DELETE' });
/* eslint-disable @typescript-eslint/no-explicit-any -- a test reads loosely shaped JSON */
const json = async (response: Response): Promise<Record<string, any>> =>
  (await response.json()) as Record<string, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('GET /api/saldo/agents', () => {
  it('lists the agents with what the panel needs to draw them', async () => {
    const desk = fresh();
    const empty = await answerAgents(desk, asker(), url(`cuenta=${NUMEN}`), quiet);
    expect(empty.status).toBe(200);
    expect(empty.headers.get('cache-control')).toBe('no-store');
    const first = await json(empty);
    expect(first['agents']).toMatchObject({
      ok: true,
      accountId: NUMEN,
      as: 'owner',
      mayCreate: true,
      agents: [],
    });
    expect(first['agents'].assignableRoles.length).toBeGreaterThan(0);
    await answerAgentWrite(desk, asker(), send('POST', { ...BOT, roleIds: [MEMBER_ROLE] }), quiet);
    const listed = await json(await answerAgents(desk, asker(), url(`cuenta=${NUMEN}`), quiet));
    expect(listed['agents'].agents).toEqual([
      {
        id: 'hermes-1',
        name: 'Hermes',
        auth: 'key',
        publicKey: BOT.publicKey,
        enabled: true,
        state: 'activa',
        hears: false,
        presence: DEFAULT_AGENT_PRESENCE,
        worlds: { todos: true },
        status: 'activa',
        responsible: ME,
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
        roleIds: [MEMBER_ROLE],
        assignable: expect.any(Array),
        mayEdit: true,
      },
    ]);
  });

  it('is for members and the house; no session, no account, no desk, a stranger', async () => {
    const desk = fresh();
    expect((await answerAgents(desk, null, url(`cuenta=${NUMEN}`), quiet)).status).toBe(401);
    expect((await answerAgents(desk, asker(), url(''), quiet)).status).toBe(400);
    expect((await answerAgents(null, asker(), url(`cuenta=${NUMEN}`), quiet)).status).toBe(503);
    const stranger = await answerAgents(
      desk,
      asker(INSTITUTE_PLAIN),
      url(`cuenta=${NUMEN}x`),
      quiet,
    );
    expect(stranger.status).toBe(403);
    expect(await json(stranger)).toMatchObject({ error: 'refused', problems: ['not a member'] });
    const plain = await json(
      await answerAgents(desk, asker(INSTITUTE_PLAIN), url(`cuenta=${INSTITUTE}`), quiet),
    );
    expect(plain['agents']).toMatchObject({ as: 'member', mayCreate: false });
    const house = await json(
      await answerAgents(desk, asker(HOUSE, true), url(`cuenta=${INSTITUTE}`), quiet),
    );
    expect(house['agents']).toMatchObject({ as: 'house', mayCreate: true });
  });

  it('answers 502 when the till answers out of shape', async () => {
    const odd = { ...fresh(), agents: async () => ({ ok: true }) } as unknown as AccountDesk;
    expect((await answerAgents(odd, asker(), url(`cuenta=${NUMEN}`), quiet)).status).toBe(502);
  });
});

describe('POST, PATCH and DELETE /api/saldo/agents', () => {
  it('creates, switches, sleeps, gives and takes a role, and removes — every answer is the list', async () => {
    const desk = fresh();
    const made = await answerAgentWrite(desk, asker(), send('POST', BOT), quiet);
    expect(made.status).toBe(200);
    expect((await json(made))['agents'].agents).toHaveLength(1);

    const off = await json(
      await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', enabled: false }),
        quiet,
      ),
    );
    expect(off['agents'].agents[0]).toMatchObject({ enabled: false, status: 'apagada' });
    const asleep = await json(
      await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', enabled: true, state: 'dormida' }),
        quiet,
      ),
    );
    expect(asleep['agents'].agents[0]).toMatchObject({
      enabled: true,
      state: 'dormida',
      // No role yet, so nothing that lets it in.
      status: 'sin-permiso',
    });
    const given = await json(
      await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', giveRole: MEMBER_ROLE }),
        quiet,
      ),
    );
    expect(given['agents'].agents[0].roleIds).toEqual([MEMBER_ROLE]);
    const taken = await json(
      await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', takeRole: MEMBER_ROLE }),
        quiet,
      ),
    );
    expect(taken['agents'].agents[0].roleIds).toEqual([]);
    const gone = await answerAgentWrite(
      desk,
      asker(),
      del(`cuenta=${NUMEN}&agente=hermes-1`),
      quiet,
    );
    expect(gone.status).toBe(200);
    expect((await json(gone))['agents'].agents).toEqual([]);

    const log = await desk.log(ME, NUMEN);
    expect(
      log.ok && log.lines.map((line) => line.act).filter((act) => act.startsWith('agent-')),
    ).toEqual([
      'agent-removed',
      'agent-role-taken',
      'agent-role-given',
      'agent-state',
      'agent-enabled',
      'agent-disabled',
      'agent-created',
    ]);
  });

  it('flips whether an AI hears nearby chat, alone or with the others, and answers the list', async () => {
    const desk = fresh();
    await answerAgentWrite(desk, asker(), send('POST', BOT), quiet);
    const on = await json(
      await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', hears: true }),
        quiet,
      ),
    );
    expect(on['agents'].agents[0]).toMatchObject({ hears: true, enabled: true });
    const both = await json(
      await answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', hears: false, state: 'dormida' }),
        quiet,
      ),
    );
    expect(both['agents'].agents[0]).toMatchObject({ hears: false, state: 'dormida' });
  });

  it('reads a till that has not learned hearing yet as an AI that hears nothing', async () => {
    const desk = fresh();
    await answerAgentWrite(desk, asker(), send('POST', BOT), quiet);
    const listed = await desk.agents(ME, NUMEN, false);
    if (!listed.ok) throw new Error('no list');
    const old = { ...listed, agents: listed.agents.map(({ hears: _hears, ...rest }) => rest) };
    const answered = await json(
      await answerAgents(
        { ...desk, agents: async () => old } as unknown as typeof desk,
        asker(),
        url(`cuenta=${NUMEN}`),
        quiet,
      ),
    );
    expect(answered['agents'].agents[0]).toMatchObject({ hears: false });
  });

  it('says where an AI lives, and reads a till that has not learned it yet as «all»', async () => {
    const desk = fresh();
    await desk.placeWorld(HOUSE, true, ['mi-rincon', 'taller-de-pruebas'], NUMEN);
    await answerAgentWrite(desk, asker(), send('POST', BOT), quiet);
    const patch = (worlds: unknown) =>
      answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', worlds }),
        quiet,
      );
    const chosen = await json(await patch({ mundos: ['mi-rincon'] }));
    expect(chosen['agents'].agents[0].worlds).toEqual({ mundos: ['mi-rincon'] });
    const all = await json(await patch({ todos: true }));
    expect(all['agents'].agents[0].worlds).toEqual({ todos: true });
    // The till judges the worlds: one that is not the community's is a refusal in its words.
    const gone = await patch({ mundos: ['nowhere'] });
    expect(gone.status).toBe(403);
    expect((await json(gone))['problems']).toEqual([PRESENCE_PROBLEMS.worldsNotHere]);
    // The shape is the route's: nothing, none, too many, a world out of shape, anything else.
    const bad = async (worlds: unknown) => expect((await patch(worlds)).status).toBe(400);
    await bad({});
    await bad({ todos: false });
    await bad({ mundos: [] });
    await bad({ mundos: [''] });
    await bad({ mundos: Array.from({ length: AGENT_WORLDS_MAX + 1 }, (_, n) => `w${n}`) });
    await bad({ mundos: ['mi-rincon'], todos: true });
    const listed = await desk.agents(ME, NUMEN, false);
    if (!listed.ok) throw new Error('no list');
    const old = {
      ...listed,
      agents: listed.agents.map(({ presence: _p, worlds: _w, ...rest }) => rest),
    };
    const answered = await json(
      await answerAgents(
        { ...desk, agents: async () => old } as unknown as typeof desk,
        asker(),
        url(`cuenta=${NUMEN}`),
        quiet,
      ),
    );
    expect(answered['agents'].agents[0]).not.toHaveProperty('worlds');
    expect(answered['agents'].agents[0]).not.toHaveProperty('presence');
    expect(DEFAULT_AGENT_PRESENCE.oye).toBe('llamada');
  });

  it('says how an AI is present, and reads a till that has not learned it yet as the defaults (S21)', async () => {
    const desk = fresh();
    await answerAgentWrite(desk, asker(), send('POST', BOT), quiet);
    const patch = (presence: unknown) =>
      answerAgentWrite(
        desk,
        asker(),
        send('PATCH', { accountId: NUMEN, id: 'hermes-1', presence }),
        quiet,
      );
    const moved = await json(await patch({ burbuja: { forma: 'caja', radio: 3 }, quedarse_h: 1 }));
    expect(moved['agents'].agents[0].presence).toEqual({
      ...DEFAULT_AGENT_PRESENCE,
      burbuja: { ...DEFAULT_AGENT_PRESENCE.burbuja, forma: 'caja', radio: 3 },
      quedarse_h: 1,
    });
    const heard = await json(await patch({ oye: 'todo' }));
    expect(heard['agents'].agents[0]).toMatchObject({ hears: true, presence: { oye: 'todo' } });
    // The shape is the domain's: nothing, an unknown field, a value out of range, anything else.
    const bad = async (presence: unknown) => expect((await patch(presence)).status).toBe(400);
    await bad({});
    await bad({ pelo: 'verde' });
    await bad({ burbuja: { radio: 99 } });
    await bad({ burbuja: { forma: 'cubo' } });
    await bad('todo');
    // …and it never travels with another change.
    const mixed = await answerAgentWrite(
      desk,
      asker(),
      send('PATCH', {
        accountId: NUMEN,
        id: 'hermes-1',
        presence: { oye: 'llamada' },
        hears: false,
      }),
      quiet,
    );
    expect(mixed.status).toBe(400);
  });

  it('refuses without a session, and a body that is not the contract’s', async () => {
    const desk = fresh();
    expect((await answerAgentWrite(desk, null, send('POST', BOT), quiet)).status).toBe(401);
    const bad = async (request: Request, status: number) =>
      expect((await answerAgentWrite(desk, asker(), request, quiet)).status).toBe(status);
    await bad(send('POST', BOT, { 'content-type': 'text/plain' }), 415);
    await bad(send('POST', '{'), 400);
    await bad(send('POST', { ...BOT, extra: 1 }), 400);
    await bad(send('POST', { accountId: NUMEN }), 400);
    await bad(send('POST', { ...BOT, roleIds: ['nope'] }), 400);
    await bad(send('PATCH', { accountId: NUMEN, id: 'hermes-1' }), 400);
    await bad(send('PATCH', { accountId: NUMEN, id: 'hermes-1', state: 'ocupada' }), 400);
    await bad(send('PATCH', { accountId: NUMEN, id: 'hermes-1', hears: 'yes' }), 400);
    await bad(send('PATCH', { accountId: NUMEN, id: 'hermes-1', giveRole: 'x' }), 400);
    await bad(
      send('PATCH', {
        accountId: NUMEN,
        id: 'hermes-1',
        giveRole: MEMBER_ROLE,
        takeRole: MEMBER_ROLE,
      }),
      400,
    );
    await bad(del(''), 400);
    await bad(del(`cuenta=${NUMEN}`), 400);
    await bad(del(`cuenta=${NUMEN}&agente=${'x'.repeat(101)}`), 400);
    const message = await json(
      await answerAgentWrite(desk, asker(), send('POST', { accountId: NUMEN }), quiet),
    );
    expect(message['error']).toMatch(/\S/);
    const root = await json(await answerAgentWrite(desk, asker(), send('POST', []), quiet));
    expect(root['error']).toMatch(/\S/);
  });

  it('is a 503 without a desk, and passes the till’s refusal on as 403 with its words', async () => {
    const desk = fresh();
    for (const request of [
      send('POST', BOT),
      send('PATCH', { accountId: NUMEN, id: 'hermes-1', enabled: false }),
      del(`cuenta=${NUMEN}&agente=hermes-1`),
    ]) {
      expect((await answerAgentWrite(null, asker(), request, quiet)).status).toBe(503);
    }
    const refused = await answerAgentWrite(
      desk,
      asker(INSTITUTE_PLAIN),
      send('POST', { ...BOT, accountId: INSTITUTE }),
      quiet,
    );
    expect(refused.status).toBe(403);
    expect((await json(refused))['problems'][0]).toMatch(/manage-roles/);
    const badKey = await answerAgentWrite(
      desk,
      asker(),
      send('POST', { ...BOT, publicKey: 'ed25519:short' }),
      quiet,
    );
    expect(badKey.status).toBe(403);
    expect(await json(badKey)).toMatchObject({ problems: [expect.stringContaining('publicKey')] });
    for (const request of [
      send('PATCH', { accountId: NUMEN, id: 'ghost', enabled: false }),
      send('PATCH', { accountId: NUMEN, id: 'ghost', giveRole: MEMBER_ROLE }),
      send('PATCH', { accountId: NUMEN, id: 'ghost', takeRole: MEMBER_ROLE }),
      del(`cuenta=${NUMEN}&agente=ghost`),
    ]) {
      const response = await answerAgentWrite(desk, asker(), request, quiet);
      expect(response.status).toBe(403);
      expect(await json(response)).toMatchObject({
        problems: ['the organization has no such agent'],
      });
    }
  });

  it('lets the house act, marked, and create where it may enter (D-078)', async () => {
    const desk = fresh();
    const owner = asker(INSTITUTE_OWNER);
    await answerAgentWrite(desk, owner, send('POST', { ...BOT, accountId: INSTITUTE }), quiet);
    const house = asker(HOUSE, true);
    const created = await answerAgentWrite(
      desk,
      house,
      send('POST', { ...BOT, accountId: INSTITUTE, id: 'other', publicKey: KEY(8) }),
      quiet,
    );
    expect(created.status).toBe(200);
    expect(await json(created)).toMatchObject({
      agents: {
        agents: expect.arrayContaining([
          expect.objectContaining({ id: 'other', responsibleHouse: true }),
        ]),
      },
    });
    const off = await answerAgentWrite(
      desk,
      house,
      send('PATCH', { accountId: INSTITUTE, id: 'hermes-1', enabled: false }),
      quiet,
    );
    expect(off.status).toBe(200);
    // The house's line carries its mark (ORG-009).
    const log = await desk.log(HOUSE, INSTITUTE, true);
    expect(log.ok && log.lines.some((line) => line.act === 'agent-disabled' && line.asHouse)).toBe(
      true,
    );
  });

  it('answers 502 for a till that fails or answers out of shape', async () => {
    const desk = fresh();
    const boom = (method: keyof AccountDesk): AccountDesk =>
      ({ ...desk, [method]: async () => Promise.reject(new Error('boom')) }) as AccountDesk;
    expect(
      (await answerAgentWrite(boom('createAgent'), asker(), send('POST', BOT), quiet)).status,
    ).toBe(502);
    expect(
      (
        await answerAgentWrite(
          boom('changeAgent'),
          asker(),
          send('PATCH', { accountId: NUMEN, id: 'a', enabled: true }),
          quiet,
        )
      ).status,
    ).toBe(502);
    expect(
      (await answerAgentWrite(boom('removeAgent'), asker(), del(`cuenta=${NUMEN}&agente=a`), quiet))
        .status,
    ).toBe(502);
  });
});

describe('the fixture desk as the account desk wires it', () => {
  it('writes the agents’ acts in the organization’s log, and the house’s reads', async () => {
    const desk = fresh();
    await desk.createAgent(ME, NUMEN, { id: 'hermes-1', name: 'Hermes', publicKey: KEY(7) });
    await desk.changeAgent(ME, NUMEN, 'hermes-1', { enabled: false });
    const lines = await desk.log(ME, NUMEN);
    expect(
      lines.ok && lines.lines.slice(0, 2).map((line) => [line.act, line.actor, line.subject]),
    ).toEqual([
      ['agent-disabled', ME, 'hermes-1'],
      ['agent-created', ME, 'hermes-1'],
    ]);
    await desk.agents(HOUSE, INSTITUTE, true);
    const read = await desk.log(HOUSE, INSTITUTE, true);
    expect(
      read.ok &&
        read.lines.some((line) => line.act === 'house-read' && line.detail?.['what'] === 'agents'),
    ).toBe(true);
  });

  it('shows the name the responsible person published, and stops giving a pass when they leave', async () => {
    const desk = fresh();
    await desk.setProfile(ME, { name: 'Pablo', avatar: null });
    await desk.createAgent(ME, NUMEN, {
      id: 'hermes-1',
      name: 'Hermes',
      publicKey: KEY(7),
      roleIds: [MEMBER_ROLE],
    });
    const listed = await desk.agents(ME, NUMEN);
    expect(listed.ok && listed.agents[0]?.responsibleName).toBe('Pablo');
    expect(await desk.agentPass(NUMEN, 'hermes-1')).toMatchObject({ ok: true, eligible: true });
    await desk.removeMember(ME, NUMEN, ME);
    expect(await desk.agentPass(NUMEN, 'hermes-1')).toMatchObject({
      ok: true,
      eligible: false,
      permissions: [],
    });
  });

  it('is shared by every wallet’s copy: the pass finds an agent whoever made it', async () => {
    const desk = fresh();
    await desk.createAgent(ME, NUMEN, { id: 'hermes-1', name: 'Hermes', publicKey: KEY(7) });
    expect(await desk.agentPass(NUMEN, 'hermes-1')).toMatchObject({ ok: true });
    const other = await desk.agents('0x00000000000000000000000000000000000000a1', NUMEN);
    expect(other.ok && other.agents.map((agent) => agent.id)).toEqual(['hermes-1']);
  });
});

describe('the bound till', () => {
  const answer = (value: unknown) => vi.fn(async () => value);
  const stub = () => {
    const base = fresh();
    return {
      ...base,
      agents: answer({ ok: true }),
      createAgent: answer({ ok: true }),
      changeAgent: answer({ ok: true }),
      changeAgentPresence: answer({ ok: true }),
      setAgentWorlds: answer({ ok: true }),
      removeAgent: answer({ ok: true }),
      giveAgentRole: answer({ ok: true }),
      takeAgentRole: answer({ ok: true }),
      agentPass: answer({ ok: true }),
      claimAgentPass: answer({ ok: true }),
    };
  };

  it('calls the ten methods as methods of the stub', async () => {
    const till = stub();
    const bound = boundAccounts(till) as AccountDesk;
    const draft = { id: 'a', name: 'A', publicKey: KEY(1) };
    await bound.agents(ME, NUMEN, true);
    await bound.createAgent(ME, NUMEN, draft, true);
    await bound.changeAgent(ME, NUMEN, 'a', { enabled: false }, true);
    await bound.changeAgentPresence(ME, NUMEN, 'a', { quedarse_h: 4 }, true);
    await bound.setAgentWorlds(ME, NUMEN, 'a', { todos: true }, true);
    await bound.removeAgent(ME, NUMEN, 'a', true);
    await bound.giveAgentRole(ME, NUMEN, 'a', MEMBER_ROLE, true);
    await bound.takeAgentRole(ME, NUMEN, 'a', MEMBER_ROLE, true);
    await bound.agentPass(NUMEN, 'a');
    await bound.claimAgentPass(NUMEN, 'a', 'agora-plaza', 5);
    expect(till.agents).toHaveBeenCalledWith(ME, NUMEN, true);
    expect(till.createAgent).toHaveBeenCalledWith(ME, NUMEN, draft, true);
    expect(till.changeAgent).toHaveBeenCalledWith(ME, NUMEN, 'a', { enabled: false }, true);
    expect(till.changeAgentPresence).toHaveBeenCalledWith(ME, NUMEN, 'a', { quedarse_h: 4 }, true);
    expect(till.setAgentWorlds).toHaveBeenCalledWith(ME, NUMEN, 'a', { todos: true }, true);
    expect(till.removeAgent).toHaveBeenCalledWith(ME, NUMEN, 'a', true);
    expect(till.giveAgentRole).toHaveBeenCalledWith(ME, NUMEN, 'a', MEMBER_ROLE, true);
    expect(till.takeAgentRole).toHaveBeenCalledWith(ME, NUMEN, 'a', MEMBER_ROLE, true);
    expect(till.agentPass).toHaveBeenCalledWith(NUMEN, 'a');
    expect(till.claimAgentPass).toHaveBeenCalledWith(NUMEN, 'a', 'agora-plaza', 5);
  });

  it('is still a desk without them, and the routes say 503 until the till learns them', async () => {
    const {
      agents: _a,
      createAgent: _c,
      changeAgent: _ch,
      changeAgentPresence: _cp,
      setAgentWorlds: _sw,
      removeAgent: _r,
      giveAgentRole: _g,
      takeAgentRole: _t,
      agentPass: _p,
      claimAgentPass: _cl,
      ...older
    } = stub();
    const bound = boundAccounts(older) as AccountDesk;
    expect(bound).not.toBeNull();
    for (const call of [
      () => bound.agents(ME, NUMEN),
      () => bound.createAgent(ME, NUMEN, { id: 'a', name: 'A', publicKey: KEY(1) }),
      () => bound.changeAgent(ME, NUMEN, 'a', { enabled: false }),
      () => bound.changeAgentPresence(ME, NUMEN, 'a', { quedarse_h: 4 }),
      () => bound.setAgentWorlds(ME, NUMEN, 'a', { todos: true }),
      () => bound.removeAgent(ME, NUMEN, 'a'),
      () => bound.giveAgentRole(ME, NUMEN, 'a', MEMBER_ROLE),
      () => bound.takeAgentRole(ME, NUMEN, 'a', MEMBER_ROLE),
      () => bound.agentPass(NUMEN, 'a'),
      () => bound.claimAgentPass(NUMEN, 'a', 'agora-plaza', 5),
    ]) {
      await expect(call()).rejects.toThrow(/does not implement the method/);
    }
    expect((await answerAgents(bound, asker(), url(`cuenta=${NUMEN}`), quiet)).status).toBe(503);
    expect(accountsFrom({ binding: older, dataSource: 'live' })).not.toBeNull();
  });
});
