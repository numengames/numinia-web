/**
 * «Agentes» (the panel's piece): reading the desk's answer, telling a failure
 * in plain kinds, the chips and the roles a row offers, and the requests the
 * island makes. The sentences of the till it tells apart are pinned to
 * lib/agents.ts's own.
 */

import { describe, expect, it } from 'vitest';
import type { DeskAgent, DeskAgents } from '../accounts';
import { AGENT_PROBLEMS, isAgentId } from '../agents';
import {
  changeBody,
  chipsOf,
  connectCommand,
  failureOf,
  invitable,
  listUrl,
  readAgents,
  readToken,
  refusalOf,
  removeUrl,
  responsibleOf,
  roleIdsFor,
  rolesToGive,
  tokenLine,
} from '../panel-agentes';
import { agentIdFrom, nameProblem } from '../world-door';

const WALLET = `0x${'ab'.repeat(20)}`;

const agent = (extra: Partial<DeskAgent> = {}): DeskAgent => ({
  id: 'hermes',
  name: 'Hermes',
  auth: 'key',
  publicKey: `ed25519:${'A'.repeat(43)}`,
  enabled: true,
  state: 'activa',
  status: 'activa',
  responsible: WALLET,
  createdAt: '2026-10-17T09:00:00.000Z',
  updatedAt: '2026-10-17T09:00:00.000Z',
  roleIds: [],
  assignable: [],
  mayEdit: true,
  ...extra,
});

const view = (agents: DeskAgent[] = [agent()], extra: Partial<DeskAgents> = {}): DeskAgents => ({
  ok: true,
  accountId: 'acc_t_games',
  as: 'owner',
  mayCreate: true,
  assignableRoles: [],
  agents,
  ...extra,
});

describe('reading the list', () => {
  it('reads the whole answer, with or without the responsible’s name', () => {
    const named = agent({ id: 'luna', responsibleName: 'Lucía' });
    const read = readAgents({ agents: view([agent(), named]) });
    expect(read).toEqual(view([agent(), named]));
    expect(read?.agents[1]?.responsibleName).toBe('Lucía');
    expect(read?.agents[0]).not.toHaveProperty('responsibleName');
  });

  it('keeps the roles the asker may assign, with or without a colour', () => {
    const roles = [
      { id: 'role_a', name: 'Equipo', color: '#3d8b5f', position: 3 },
      { id: 'role_b', name: 'Finanzas', color: null, position: 2 },
    ];
    expect(readAgents({ agents: view([], { assignableRoles: roles }) })?.assignableRoles).toEqual(
      roles,
    );
  });

  it('refuses anything that is not that shape', () => {
    const good = view();
    const bad: unknown[] = [
      null,
      [],
      {},
      { agents: null },
      { agents: [] },
      { agents: { ...good, ok: false } },
      { agents: { ...good, accountId: 1 } },
      { agents: { ...good, as: 'guest' } },
      { agents: { ...good, mayCreate: 'yes' } },
      { agents: { ...good, assignableRoles: 'x' } },
      { agents: { ...good, assignableRoles: [null] } },
      { agents: { ...good, assignableRoles: [{ id: 1, name: 'a', color: null, position: 1 }] } },
      { agents: { ...good, assignableRoles: [{ id: 'a', name: 1, color: null, position: 1 }] } },
      { agents: { ...good, assignableRoles: [{ id: 'a', name: 'a', color: 3, position: 1 }] } },
      {
        agents: { ...good, assignableRoles: [{ id: 'a', name: 'a', color: null, position: '1' }] },
      },
      { agents: { ...good, agents: 'x' } },
      { agents: { ...good, agents: [null] } },
      { agents: { ...good, agents: [{ ...agent(), id: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), name: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), publicKey: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), enabled: 'on' }] } },
      { agents: { ...good, agents: [{ ...agent(), state: 'dormido' }] } },
      { agents: { ...good, agents: [{ ...agent(), state: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), status: 'perdida' }] } },
      { agents: { ...good, agents: [{ ...agent(), status: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), responsible: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), createdAt: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), updatedAt: 1 }] } },
      { agents: { ...good, agents: [{ ...agent(), roleIds: 'x' }] } },
      { agents: { ...good, agents: [{ ...agent(), roleIds: [1] }] } },
      { agents: { ...good, agents: [{ ...agent(), assignable: [1] }] } },
      { agents: { ...good, agents: [{ ...agent(), mayEdit: 'yes' }] } },
    ];
    for (const body of bad) expect(readAgents(body)).toBeNull();
  });
});

describe('a call that did not give the list', () => {
  it('is told by its status, never by a raw code', () => {
    expect(failureOf(401, null)).toEqual({ kind: 'signed-out' });
    expect(failureOf(503, { error: 'not-bound' })).toEqual({ kind: 'unavailable' });
    expect(failureOf(400, { error: 'name: too long' })).toEqual({ kind: 'invalid' });
    expect(failureOf(502, { error: 'till-failed' })).toEqual({ kind: 'failed' });
    expect(failureOf(500, null)).toEqual({ kind: 'failed' });
  });

  it('carries the till’s refusal as it came', () => {
    expect(failureOf(403, { error: 'refused', problems: ['not a member'] })).toEqual({
      kind: 'refused',
      problems: ['not a member'],
    });
  });

  it('is plainly failed when a 403 carries no problems', () => {
    expect(failureOf(403, null)).toEqual({ kind: 'failed' });
    expect(failureOf(403, [])).toEqual({ kind: 'failed' });
    expect(failureOf(403, { problems: 'x' })).toEqual({ kind: 'failed' });
    expect(failureOf(403, { problems: [1] })).toEqual({ kind: 'failed' });
  });
});

describe('the refusals of the till', () => {
  it('tells apart the agents’ own, in the till’s own words (pinned to lib/agents.ts)', () => {
    const own: [string, string][] = [
      [AGENT_PROBLEMS.noSuchAgent, 'noSuchAgent'],
      [AGENT_PROBLEMS.taken, 'taken'],
      [AGENT_PROBLEMS.limit, 'limit'],
      [AGENT_PROBLEMS.houseCannot, 'houseCannot'],
      ['the organization has no such role', 'noSuchRole'],
    ];
    for (const [problem, key] of own) {
      expect(refusalOf([problem])).toEqual({ kind: 'agent', problem: key });
    }
  });

  it('reads a field the form should have caught as invalid data', () => {
    for (const problem of [
      AGENT_PROBLEMS.agentId,
      AGENT_PROBLEMS.name,
      AGENT_PROBLEMS.publicKey,
      AGENT_PROBLEMS.roleIds,
      AGENT_PROBLEMS.change,
      AGENT_PROBLEMS.enabled,
      AGENT_PROBLEMS.state,
      AGENT_PROBLEMS.draft,
      'roleId must be a role id',
    ]) {
      expect(refusalOf([problem])).toEqual({ kind: 'agent', problem: 'invalid' });
    }
  });

  it('leaves the organization’s refusals to Saldo’s words', () => {
    expect(refusalOf(['not a member'])).toEqual({
      kind: 'organization',
      read: { key: 'notMember' },
    });
    expect(
      refusalOf(['you may act only on roles and members below your own highest role']),
    ).toEqual({ kind: 'organization', read: { key: 'notBelow' } });
    expect(refusalOf(['something nobody planned'])).toEqual({
      kind: 'organization',
      read: { key: 'other' },
    });
    expect(refusalOf([])).toEqual({ kind: 'organization', read: { key: 'other' } });
  });

  it('puts an agent’s own sentence before the organization’s', () => {
    expect(refusalOf(['not a member', AGENT_PROBLEMS.limit])).toEqual({
      kind: 'agent',
      problem: 'limit',
    });
  });
});

describe('a row', () => {
  const roles = [
    { id: 'role_low', name: 'Visita', color: null, position: 1 },
    { id: 'role_top', name: 'Equipo', color: '#3d8b5f', position: 3 },
    { id: 'role_mid', name: 'Finanzas', color: '#c0392b', position: 2 },
  ];

  it('names who answers for the AI: the published name, else the short wallet', () => {
    expect(responsibleOf(agent({ responsibleName: 'Lucía' }))).toBe('Lucía');
    expect(responsibleOf(agent())).toBe('0xabab…abab');
  });

  it('draws the roles it holds, top first, and only the ones the asker may take off', () => {
    const held = agent({
      roleIds: ['role_low', 'role_top', 'role_gone'],
      assignable: ['role_top', 'role_mid'],
    });
    expect(chipsOf(held, roles)).toEqual([
      { id: 'role_top', name: 'Equipo', color: '#3d8b5f', removable: true },
      { id: 'role_low', name: 'Visita', color: null, removable: false },
    ]);
  });

  it('takes nothing off an AI the asker may not edit', () => {
    const held = agent({ roleIds: ['role_top'], assignable: ['role_top'], mayEdit: false });
    expect(chipsOf(held, roles)[0]?.removable).toBe(false);
  });

  it('offers the roles the asker may assign and the AI does not hold, top first', () => {
    const answer = view([], { assignableRoles: roles });
    const row = agent({
      roleIds: ['role_top'],
      assignable: ['role_low', 'role_top', 'role_mid'],
    });
    expect(rolesToGive(row, answer).map((role) => role.id)).toEqual(['role_mid', 'role_low']);
    expect(rolesToGive({ ...row, mayEdit: false }, answer)).toEqual([]);
    expect(rolesToGive({ ...row, assignable: [] }, answer)).toEqual([]);
  });

  it('lets an invitation pick among the assignable roles, top first', () => {
    expect(invitable(view([], { assignableRoles: roles })).map((role) => role.id)).toEqual([
      'role_top',
      'role_mid',
      'role_low',
    ]);
    expect(invitable(view())).toEqual([]);
  });
});

describe('what the island sends', () => {
  it('«Mirar y hablar» carries no role, «También construir» the ones picked', () => {
    expect(roleIdsFor('talk', ['role_a'])).toEqual([]);
    expect(roleIdsFor('build', ['role_a', 'role_b'])).toEqual(['role_a', 'role_b']);
  });

  it('writes the four changes with the organization and the AI', () => {
    expect(changeBody('acc_t_1', 'hermes', { enabled: false })).toEqual({
      accountId: 'acc_t_1',
      id: 'hermes',
      enabled: false,
    });
    expect(changeBody('acc_t_1', 'hermes', { state: 'dormida' })).toEqual({
      accountId: 'acc_t_1',
      id: 'hermes',
      state: 'dormida',
    });
    expect(changeBody('acc_t_1', 'hermes', { giveRole: 'role_a' })).toMatchObject({
      giveRole: 'role_a',
    });
    expect(changeBody('acc_t_1', 'hermes', { takeRole: 'role_a' })).toMatchObject({
      takeRole: 'role_a',
    });
  });

  it('encodes the addresses', () => {
    expect(listUrl('acc t/1')).toBe('/api/saldo/agents?cuenta=acc%20t%2F1');
    expect(removeUrl('acc_t_1', 'a&b')).toBe('/api/saldo/agents?cuenta=acc_t_1&agente=a%26b');
  });

  it('gets an id from a name that the till always takes (the world’s slug, the till’s rule)', () => {
    for (const name of [
      'Hermes',
      'Hermes Pablo',
      'Ñandú 7',
      '3PO',
      'Ana-María_2',
      '日本語 IA',
      '--',
    ]) {
      if (nameProblem(name) !== null) continue;
      expect(isAgentId(agentIdFrom(name))).toBe(true);
    }
    expect(isAgentId(agentIdFrom('Hermes Pablo'))).toBe(true);
  });
});

describe('the token way', () => {
  const TOKEN = `ntk_${'B'.repeat(43)}`;
  const tokened = (extra: Partial<DeskAgent> = {}): DeskAgent =>
    agent({
      auth: 'token',
      publicKey: undefined,
      tokenPrefix: 'BBBBBBBB',
      tokenCreatedAt: '2026-10-17T09:00:00.000Z',
      ...extra,
    });

  it('reads a token row with its prefix and day, and never needs a key', () => {
    const row = tokened();
    const read = readAgents({ agents: view([row]) });
    expect(read?.agents[0]).toMatchObject({
      auth: 'token',
      tokenPrefix: 'BBBBBBBB',
      tokenCreatedAt: '2026-10-17T09:00:00.000Z',
    });
    expect(read?.agents[0]).not.toHaveProperty('publicKey');
    // A revoked token has neither.
    const revoked = readAgents({
      agents: view([tokened({ tokenPrefix: undefined, tokenCreatedAt: undefined })]),
    });
    expect(revoked?.agents[0]).not.toHaveProperty('tokenPrefix');
  });

  it('refuses a row whose way or token fields are not what the contract says', () => {
    for (const bad of [
      { auth: 'other' },
      { auth: undefined },
      { publicKey: 7 },
      { tokenPrefix: 7 },
      { tokenCreatedAt: 7 },
    ]) {
      expect(readAgents({ agents: view([agent(bad as never)]) })).toBeNull();
    }
  });

  it('reads the secret of an answer only when it is shaped like a token', () => {
    expect(readToken({ agents: {}, token: TOKEN })).toBe(TOKEN);
    expect(readToken({ agents: {} })).toBeNull();
    expect(readToken({ token: 'ntk_short' })).toBeNull();
    expect(readToken({ token: 7 })).toBeNull();
    expect(readToken('text')).toBeNull();
    expect(readToken(null)).toBeNull();
  });

  it('shows the prefix and the day of a token row, and nothing for a key row', () => {
    expect(tokenLine(tokened())).toEqual({ shown: 'ntk_BBBBBBBB…', day: '2026-10-17' });
    expect(tokenLine(tokened({ tokenCreatedAt: undefined }))).toEqual({
      shown: 'ntk_BBBBBBBB…',
      day: '',
    });
    expect(tokenLine(tokened({ tokenPrefix: undefined }))).toBeNull();
    expect(tokenLine(agent())).toBeNull();
  });

  it('tells «that agent connects with a key» apart and builds the renewal body', () => {
    expect(refusalOf([AGENT_PROBLEMS.notToken])).toEqual({ kind: 'agent', problem: 'notToken' });
    expect(changeBody('acc_t', 'hermes', { renewToken: true })).toEqual({
      accountId: 'acc_t',
      id: 'hermes',
      renewToken: true,
    });
  });

  it('writes the three lines that connect the AI to Hermes with the real flags', () => {
    const text = connectCommand({
      origin: 'https://numinia.com',
      org: 'acc_t_games',
      id: 'hermes',
      token: TOKEN,
    });
    const [cd, add, test] = text.split('\n');
    expect(cd).toBe('cd numinia-engine');
    expect(add).toBe(
      `hermes mcp add numinia-mundo --command node --env NUMINIA_URL=https://numinia.com AGENTE_ORG=acc_t_games AGENTE_ID=hermes AGENTE_TOKEN=${TOKEN} MUNDO_URL=wss://TU-MUNDO/ws --args "$PWD/tools/mcp-mundo.ts"`,
    );
    expect(test).toBe('hermes mcp test numinia-mundo');
  });
});
