/**
 * «MCP remoto», stories W4 and W6: what the «Conecta tu IA» consent page
 * reads (its query, fail closed; the communities and roles on offer) and
 * what its POST answers (lib/conectar-ia-page.ts) — the origin check, the
 * body, every refusal named, the relay asked before anything is made, and
 * the token that goes to the relay and never to the browser.
 */

import { describe, expect, it, vi } from 'vitest';
import deskSeed from '../../../fixtures/accounts/desk.json';
import { NOT_IMPLEMENTED, type AccountDesk, type Asker, type DeskAgents } from '../accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from '../accounts-fixture';
import { hashToken } from '../agents';
import {
  AGENTS_PANEL_PATH,
  COMMUNITIES_PATH,
  CONSENT_API,
  CONSENT_PATH,
  answerConsent,
  consentChoices,
  consentHref,
  hostLabels,
  readConsentAsk,
} from '../conectar-ia-page';
import { fixtureRelay, vueltaHref, type Relay } from '../relay-handoff';

const ORG = 'acc_team_numen_games';
const OTHER = 'acc_team_reset';
const MEMBER_ROLE = `role_${(3).toString(16).padStart(16, '0')}`;
const ME = `0x${'ab'.repeat(20)}`;
const NOW_MS = Date.parse('2026-10-19T19:00:00.000Z');
const REQ = 'req_0123456789abcdef';
const ORIGIN = 'https://numinia.com';
const quiet = vi.fn();

const seed = deskSeed as unknown as AccountsSeed;
const fixture = (): AccountDesk => createAccountsFixtureDesk(seed, () => new Date(NOW_MS));
const asker = (house = false): Asker => ({ wallet: ME, house });

const FRESH = { token: `ntk_${'x'.repeat(43)}`, hash: 'f'.repeat(64), prefix: 'xxxxxxxx' };
const draw = async () => FRESH;
const relay = fixtureRelay;

const query = (over: Record<string, string> = {}): string =>
  new URLSearchParams({ app: 'Claude', host: 'claude.ai', req: REQ, ...over }).toString();

describe('the page’s query, fail closed', () => {
  it('reads the app, the host and the request id, with the loopback warning', () => {
    expect(readConsentAsk(`?${query()}`)).toEqual({
      app: 'Claude',
      host: 'claude.ai',
      req: REQ,
      loopback: false,
    });
    expect(readConsentAsk(query({ host: 'LOCALHOST.', app: '  Hermes  ' }))).toEqual({
      app: 'Hermes',
      host: 'localhost',
      req: REQ,
      loopback: true,
    });
    expect(readConsentAsk(query({ host: '127.0.0.1' }))?.loopback).toBe(true);
  });

  it('cuts a long app name to the 40 characters the consent shows', () => {
    expect(readConsentAsk(query({ app: 'a'.repeat(120) }))?.app).toBe('a'.repeat(40));
  });

  it('shows no form when any of the three is missing or wrong', () => {
    for (const bad of [
      '',
      new URLSearchParams({ host: 'claude.ai', req: REQ }).toString(),
      new URLSearchParams({ app: 'Claude', req: REQ }).toString(),
      new URLSearchParams({ app: 'Claude', host: 'claude.ai' }).toString(),
      query({ req: 'short' }),
      query({ req: `${REQ}/../x` }),
      query({ req: 'r'.repeat(129) }),
      query({ app: 'x'.repeat(201) }),
      query({ host: 'h'.repeat(254) }),
      query({ host: 'https://claude.ai/cb' }),
      query({ host: 'claude ai' }),
      query({ app: '   ' }),
      query({ app: 'bad\u0007name' }),
    ]) {
      expect(readConsentAsk(bad)).toBeNull();
    }
  });

  it('builds the page’s own address for the sign-in door to come back to', () => {
    const ask = readConsentAsk(query({ host: 'localhost' }));
    if (ask === null) throw new Error('unread');
    expect(consentHref(ask)).toBe(`${CONSENT_PATH}?app=Claude&host=localhost&req=${REQ}`);
    expect(readConsentAsk(consentHref(ask).slice(CONSENT_PATH.length))).toEqual(ask);
    expect(CONSENT_API).toBe('/api/conectar-ia');
  });
});

describe('the machine it goes back to, in pieces that never break inside', () => {
  it('cuts after each dot and keeps every piece whole', () => {
    expect(hostLabels('machine-1031.agents.nousresearch.com')).toEqual([
      'machine-1031.',
      'agents.',
      'nousresearch.',
      'com',
    ]);
    expect(hostLabels('localhost')).toEqual(['localhost']);
    expect(hostLabels('127.0.0.1')).toEqual(['127.', '0.', '0.', '1']);
    expect(hostLabels('claude.ai').join('')).toBe('claude.ai');
  });

  it('names where the no-community and Listo pages send people', () => {
    expect(COMMUNITIES_PATH).toBe('/belong/');
    expect(AGENTS_PANEL_PATH).toBe('/panel/agentes/');
  });
});

// ---- What the person may pick ----------------------------------------------

const agentsView = (over: Partial<Extract<DeskAgents, { ok: true }>> = {}): DeskAgents => ({
  ok: true,
  accountId: ORG,
  as: 'owner',
  mayCreate: true,
  assignableRoles: [
    { id: 'role_build', name: 'Build', color: null, position: 2 },
    { id: 'role_guide', name: 'Guide', color: '#fff', position: 3 },
  ],
  agents: [
    {
      id: 'claude-de-ana',
      name: 'Claude de Ana',
      auth: 'token',
      enabled: false,
      roleIds: ['role_build'],
      assignable: ['role_build', 'role_guide'],
      mayEdit: true,
    },
    {
      id: 'llave',
      name: 'Llave',
      auth: 'key',
      enabled: true,
      roleIds: [],
      assignable: [],
      mayEdit: true,
    },
  ] as unknown as Extract<DeskAgents, { ok: true }>['agents'],
  ...over,
});

const ACCOUNTS = {
  accounts: [
    { id: 'acc_personal', kind: 'personal', name: null, role: 'owner', balanceCents: 0 },
    { id: ORG, kind: 'team', name: 'Numen Games', role: 'admin', balanceCents: 88 },
    { id: OTHER, kind: 'team', name: null, role: 'member', balanceCents: 0 },
  ],
};

function choicesDesk(
  agents: (wallet: string, accountId: string, house?: boolean) => Promise<unknown>,
  overview: () => Promise<unknown> = async () => ACCOUNTS,
) {
  const methods = { overview: vi.fn(overview), agents: vi.fn(agents) };
  return { desk: methods as unknown as AccountDesk, methods };
}

describe('the communities and roles on offer', () => {
  it('asks nothing without a session, and says unavailable without a till', async () => {
    expect(await consentChoices(fixture(), null)).toEqual({ ok: false, reason: 'signed-out' });
    expect(await consentChoices(null, asker(), quiet)).toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('lists the teams where the person may add an AI, with the roles they can give, and the token AIs to reconnect', async () => {
    const { desk, methods } = choicesDesk(async (_wallet, accountId) =>
      accountId === ORG ? agentsView() : agentsView({ accountId, agents: [] }),
    );
    const choices = await consentChoices(
      desk,
      { wallet: ME.toUpperCase().replace('0X', '0x'), house: false },
      quiet,
    );
    expect(methods.overview).toHaveBeenCalledWith(ME);
    expect(methods.agents).toHaveBeenCalledTimes(2);
    expect(methods.agents).toHaveBeenCalledWith(ME, ORG, false);
    expect(choices).toEqual({
      ok: true,
      orgs: [
        {
          accountId: ORG,
          name: 'Numen Games',
          mayCreate: true,
          roles: [
            { id: 'role_build', name: 'Build' },
            { id: 'role_guide', name: 'Guide' },
          ],
          again: [
            {
              id: 'claude-de-ana',
              name: 'Claude de Ana',
              roles: [{ id: 'role_guide', name: 'Guide' }],
            },
          ],
          house: false,
          loaded: true,
        },
        // A team without a name shows its id; one with nothing to reconnect still offers «new».
        {
          accountId: OTHER,
          name: OTHER,
          mayCreate: true,
          roles: expect.any(Array),
          again: [],
          house: false,
          loaded: true,
        },
      ],
    });
  });

  it('leaves out a team where nothing can be done, refused or failed', async () => {
    const nothing = choicesDesk(async () => agentsView({ mayCreate: false, agents: [] }));
    expect(await consentChoices(nothing.desk, asker(), quiet)).toEqual({ ok: true, orgs: [] });

    const onlyAgain = choicesDesk(async (_w, accountId) =>
      accountId === ORG
        ? agentsView({ mayCreate: false })
        : { ok: false, problems: ['not a member'] },
    );
    const read = await consentChoices(onlyAgain.desk, asker(), quiet);
    expect(
      read.ok && read.orgs.map((org) => [org.accountId, org.mayCreate, org.again.length]),
    ).toEqual([[ORG, false, 1]]);

    const throwing = choicesDesk(async () => {
      throw new Error('boom');
    });
    expect(await consentChoices(throwing.desk, asker(), quiet)).toEqual({ ok: true, orgs: [] });
  });

  it('says unavailable when the overview is refused, fails, is out of shape or is not bound', async () => {
    const agents = async () => agentsView();
    for (const overview of [
      async () => ({ ok: false, problems: ['bad wallet'] }),
      async () => ({ accounts: 'nope' }),
      async () => {
        throw new Error('down');
      },
      async () => {
        throw new Error(`AccountDesk ${NOT_IMPLEMENTED} overview`);
      },
    ]) {
      const { desk } = choicesDesk(agents, overview);
      expect(await consentChoices(desk, asker(), quiet)).toEqual({
        ok: false,
        reason: 'unavailable',
      });
    }
  });

  it('reads the fixture desk: the team where the wallet is admin, its roles to give', async () => {
    const choices = await consentChoices(fixture(), asker(), quiet);
    if (!choices.ok) throw new Error('unavailable');
    const numen = choices.orgs.find((org) => org.accountId === ORG);
    expect(numen).toMatchObject({ name: 'Numen Games', mayCreate: true, again: [] });
    expect(numen?.roles.map((role) => role.id)).toContain(MEMBER_ROLE);
  });

  it('acts as the person for the house’s Oracle: a member with manage-roles sees the org, one without sees nothing', async () => {
    // As the till answers: with the house flag a non-owner acts as the house, which may not create.
    const { desk, methods } = choicesDesk(async (_wallet, accountId, house) => {
      const asHouse = house === true;
      if (accountId === OTHER) return agentsView({ accountId, mayCreate: false, agents: [] });
      return agentsView({
        accountId,
        as: asHouse ? 'house' : 'member',
        mayCreate: !asHouse,
        agents: [],
      });
    });
    const choices = await consentChoices(desk, asker(true), quiet);
    expect(methods.agents.mock.calls.map(([, , house]) => house)).toEqual([false, false]);
    expect(choices).toMatchObject({ ok: true, orgs: [{ accountId: ORG, mayCreate: true }] });
    if (choices.ok) expect(choices.orgs.map((org) => org.accountId)).toEqual([ORG]);
  });

  it('adds, for the house’s session, the other communities that let it in, as the house (D-078)', async () => {
    const choices = await consentChoices(fixture(), asker(true), quiet);
    if (!choices.ok) throw new Error('no choices');
    const own = choices.orgs.filter((org) => !org.house);
    const doors = choices.orgs.filter((org) => org.house);
    expect(own.length).toBeGreaterThan(0);
    expect(doors.length).toBeGreaterThan(0);
    // The person acting as a member wins: no community is in both lists.
    const ids = choices.orgs.map((org) => org.accountId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(doors.map((org) => org.accountId)).toContain(OTHER);
    // With communities of their own, the house's are only names until one is picked.
    expect(doors.every((org) => !org.loaded && !org.mayCreate && org.roles.length === 0)).toBe(
      true,
    );
  });

  it('reads one house community when it is asked for, as the house, and leaves the rest unread', async () => {
    const { desk, methods } = choicesDesk(
      async (_wallet, accountId, house) =>
        house === true
          ? agentsView({ accountId, agents: [], as: 'house' })
          : accountId === ORG
            ? agentsView()
            : { ok: false, problems: ['not a member'] },
      async () => ({ accounts: [ACCOUNTS.accounts[1]] }),
    );
    (desk as unknown as { directory: unknown }).directory = vi.fn(async () => ({
      ok: true,
      accounts: [
        { id: ORG, name: 'Numen Games' },
        { id: OTHER, name: 'Reset' },
        { id: 'acc_team_la_tarugo', name: 'La Tarugo' },
      ],
    }));
    const choices = await consentChoices(desk, asker(true), quiet, OTHER);
    if (!choices.ok) throw new Error('no choices');
    expect(choices.orgs.map((org) => [org.accountId, org.house, org.loaded])).toEqual([
      [ORG, false, true],
      [OTHER, true, true],
      ['acc_team_la_tarugo', true, false],
    ]);
    expect(choices.orgs[1]).toMatchObject({ name: 'Reset', mayCreate: true });
    // ORG is the person’s own: not read again as the house. La Tarugo was only named.
    expect(methods.agents).toHaveBeenCalledWith(ME, ORG, false);
    expect(methods.agents).toHaveBeenCalledWith(ME, OTHER, true);
    expect(methods.agents).not.toHaveBeenCalledWith(ME, 'acc_team_la_tarugo', expect.anything());
    // The house is read as itself, never for a community the person acts in.
    expect(methods.agents).not.toHaveBeenCalledWith(ME, ORG, true);
  });

  it('loads the first house community when the person has none of their own', async () => {
    const { desk, methods } = choicesDesk(
      async (_wallet, accountId, house) =>
        house === true
          ? agentsView({ accountId, agents: [], as: 'house' })
          : { ok: false, problems: ['not a member'] },
      async () => ({ accounts: [] }),
    );
    (desk as unknown as { directory: unknown }).directory = vi.fn(async () => ({
      ok: true,
      accounts: [
        { id: ORG, name: 'Numen Games' },
        { id: OTHER, name: 'Reset' },
      ],
    }));
    const choices = await consentChoices(desk, asker(true), quiet);
    expect(choices.ok && choices.orgs.map((org) => [org.accountId, org.loaded])).toEqual([
      [ORG, true],
      [OTHER, false],
    ]);
    expect(methods.agents).toHaveBeenCalledTimes(1);
  });

  it('lists no house community for a session that is not the house’s, or when the directory fails', async () => {
    const person = await consentChoices(fixture(), asker(false), quiet);
    expect(person.ok && person.orgs.every((org) => !org.house)).toBe(true);
    const { desk } = choicesDesk(async () => agentsView());
    (desk as unknown as { directory: unknown }).directory = vi.fn(async () => {
      throw new Error('boom');
    });
    const failed = await consentChoices(desk, asker(true), quiet);
    expect(failed.ok && failed.orgs.every((org) => !org.house)).toBe(true);
    (desk as unknown as { directory: unknown }).directory = vi.fn(async () => ({
      ok: false,
      problems: ['not the house'],
    }));
    const refused = await consentChoices(desk, asker(true), quiet);
    expect(refused.ok && refused.orgs.every((org) => !org.house)).toBe(true);
  });
});

// ---- The POST ----------------------------------------------------------------

const body = (over: Record<string, unknown> = {}) => ({
  req: REQ,
  app: 'Claude',
  host: 'claude.ai',
  accountId: ORG,
  ai: { kind: 'new', name: 'Claude de Ana' },
  roleId: null,
  ...over,
});

const post = (json: unknown, headers: Record<string, string> = {}): Request =>
  new Request(`${ORIGIN}${CONSENT_API}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
    body: typeof json === 'string' ? json : JSON.stringify(json),
  });

const same = { origin: ORIGIN, requestOrigin: ORIGIN };

describe('the POST: who may send it', () => {
  it('refuses, 403, a request without an Origin or from another site — before reading anything', async () => {
    const desk = { agents: vi.fn() } as unknown as AccountDesk;
    for (const requestOrigin of [null, 'https://evil.example', 'http://numinia.com']) {
      const response = await answerConsent(
        desk,
        asker(),
        post(body()),
        { origin: ORIGIN, requestOrigin },
        relay,
      );
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ ok: false, refusal: 'forbidden' });
    }
    expect((desk as unknown as { agents: ReturnType<typeof vi.fn> }).agents).not.toHaveBeenCalled();
  });

  it('answers 401 signed out, and 503 without a till or without a relay', async () => {
    const out = await answerConsent(fixture(), null, post(body()), same, relay, quiet);
    expect(out.status).toBe(401);
    expect(await out.json()).toEqual({ ok: false, refusal: 'signed-out' });
    const none = await answerConsent(null, asker(), post(body()), same, relay, quiet);
    expect(none.status).toBe(503);
    expect(await none.json()).toEqual({ ok: false, refusal: 'unavailable' });
    const desk = fixture();
    const noRelay = await answerConsent(desk, asker(), post(body()), same, null, quiet, draw);
    expect([noRelay.status, (await noRelay.json()).refusal]).toEqual([503, 'unavailable']);
    // Nothing was made.
    const listed = await desk.agents(ME, ORG);
    expect(listed.ok && listed.agents.some((agent) => agent.id === 'claude-de-ana')).toBe(false);
  });

  it('takes JSON only (a cross-site form cannot send it), and only the shape it names', async () => {
    const form = await answerConsent(
      fixture(),
      asker(),
      post('req=x', { 'content-type': 'application/x-www-form-urlencoded' }),
      same,
      relay,
      quiet,
    );
    expect(form.status).toBe(415);
    for (const wrong of [
      body({ ai: { kind: 'other' } }),
      body({ accountId: '' }),
      body({ roleId: 7 }),
      body({ hear: 'yes' }),
      { req: REQ },
    ]) {
      const response = await answerConsent(fixture(), asker(), post(wrong), same, relay, quiet);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, refusal: 'request' });
    }
    for (const badAsk of [
      body({ req: 'short' }),
      body({ host: 'claude ai' }),
      body({ app: ' ' }),
    ]) {
      const response = await answerConsent(fixture(), asker(), post(badAsk), same, relay, quiet);
      expect(response.status).toBe(400);
    }
  });
});

describe('the POST: connecting', () => {
  it('makes the AI, hands its token to the relay and never answers it', async () => {
    const desk = fixture();
    const log = vi.fn();
    const check = vi.fn(fixtureRelay.check);
    const handOff = vi.fn(fixtureRelay.handOff);
    const response = await answerConsent(
      desk,
      asker(),
      post(body({ roleId: MEMBER_ROLE, host: 'LOCALHOST' })),
      same,
      { check, handOff },
      log,
    );
    expect(check).toHaveBeenCalledWith({
      app: 'Claude',
      host: 'localhost',
      req: REQ,
      loopback: true,
    });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).not.toContain('ntk_');
    expect(JSON.parse(text)).toEqual({
      ok: true,
      connection: {
        req: REQ,
        action: 'create',
        accountId: ORG,
        agentId: 'claude-de-ana',
        name: 'Claude de Ana',
        via: 'mcp:localhost',
        hear: false,
      },
      next: null,
    });
    const [connection, token] = handOff.mock.calls[0] ?? [];
    expect(connection?.agentId).toBe('claude-de-ana');
    const found = await desk.agentByToken(await hashToken(token ?? ''));
    expect(found.ok && found.agent.id).toBe('claude-de-ana');
    const listed = await desk.agents(ME, ORG);
    expect(listed.ok && listed.agents.find((held) => held.id === 'claude-de-ana')?.roleIds).toEqual(
      [MEMBER_ROLE],
    );
    // Logged by rule only: never the token, never the request id.
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain('agent-consent');
    expect(logged).not.toContain(token ?? 'ntk_');
    expect(logged).not.toContain(REQ);
  });

  it('makes the AI hear nearby chat only when the box was ticked', async () => {
    const desk = fixture();
    const ticked = await answerConsent(
      desk,
      asker(),
      post(body({ hear: true })),
      same,
      relay,
      quiet,
      draw,
    );
    expect(await ticked.json()).toMatchObject({ ok: true, connection: { hear: true } });
    const listed = await desk.agents(ME, ORG);
    expect(listed.ok && listed.agents.find((held) => held.id === 'claude-de-ana')?.hears).toBe(
      true,
    );
  });

  it('connects as the house only when the choice says house and the session is the house’s (D-078)', async () => {
    const desk = fixture();
    const house = await answerConsent(
      desk,
      asker(true),
      post(body({ accountId: OTHER, house: true })),
      same,
      relay,
      quiet,
      draw,
    );
    expect(house.status).toBe(200);
    const listed = await desk.agents(ME, OTHER, true);
    expect(
      listed.ok && listed.agents.find((held) => held.id === 'claude-de-ana')?.responsibleHouse,
    ).toBe(true);
    // A person's session cannot claim the house.
    const person = await answerConsent(
      desk,
      asker(false),
      post(body({ accountId: OTHER, house: true })),
      same,
      relay,
      quiet,
      draw,
    );
    expect(person.status).toBe(403);
    // Without the flag, even an Oracle acts as themselves (and is no member of OTHER).
    const plain = await answerConsent(
      fixture(),
      asker(true),
      post(body({ accountId: OTHER })),
      same,
      relay,
      quiet,
      draw,
    );
    expect(plain.status).not.toBe(200);
  });

  it('reconnects one already made, and sends the browser where the hand-off says', async () => {
    const desk = fixture();
    const first = await answerConsent(desk, asker(), post(body()), same, relay, quiet, draw);
    expect(first.status).toBe(200);
    const next = vueltaHref(REQ);
    const again = await answerConsent(
      desk,
      asker(),
      post(
        body({
          ai: { kind: 'again', agentId: 'claude-de-ana' },
          app: 'ChatGPT',
          host: 'chatgpt.com',
        }),
      ),
      same,
      { check: relay.check, handOff: async () => ({ ok: true, next }) },
      quiet,
    );
    expect(await again.json()).toMatchObject({
      ok: true,
      connection: { action: 'renew', agentId: 'claude-de-ana', via: 'mcp:chatgpt.com' },
      next: 'https://mcp.numinia.com/vuelta?req=req_0123456789abcdef',
    });
  });

  it('makes nothing when the relay is not waiting for the request, or is down', async () => {
    for (const [said, status] of [
      ['request', 400],
      ['unavailable', 503],
    ] as const) {
      const desk = fixture();
      const handOff = vi.fn(fixtureRelay.handOff);
      const refusing: Relay = { check: async () => said, handOff };
      const response = await answerConsent(
        desk,
        asker(),
        post(body()),
        same,
        refusing,
        quiet,
        draw,
      );
      expect([response.status, (await response.json()).refusal]).toEqual([status, said]);
      expect(handOff).not.toHaveBeenCalled();
      const listed = await desk.agents(ME, ORG);
      expect(listed.ok && listed.agents.some((agent) => agent.id === 'claude-de-ana')).toBe(false);
    }
  });

  it('says so when the relay refuses the hand-off (its 10 minutes ran out meanwhile)', async () => {
    for (const refusal of ['request', 'unavailable'] as const) {
      const refusing: Relay = {
        check: fixtureRelay.check,
        handOff: async () => ({ ok: false, refusal }),
      };
      const response = await answerConsent(fixture(), asker(), post(body()), same, refusing, quiet);
      const text = await response.text();
      expect([response.status, JSON.parse(text).refusal]).toEqual([
        refusal === 'request' ? 400 : 503,
        refusal,
      ]);
      expect(text).not.toContain('ntk_');
    }
  });

  it('names every refusal with its status', async () => {
    const desk = fixture();
    await answerConsent(desk, asker(), post(body()), same, relay, quiet, draw);
    const cases: [Record<string, unknown>, number, string][] = [
      [body(), 409, 'taken'],
      [body({ ai: { kind: 'new', name: '' } }), 400, 'name'],
      [body({ roleId: 'role_nope', ai: { kind: 'new', name: 'Otra' } }), 403, 'role'],
      [body({ ai: { kind: 'again', agentId: 'nadie' } }), 404, 'no-such-agent'],
      [body({ accountId: OTHER }), 403, 'till'],
    ];
    for (const [sent, status, refusal] of cases) {
      const response = await answerConsent(desk, asker(), post(sent), same, relay, quiet, draw);
      expect([response.status, (await response.json()).refusal]).toEqual([status, refusal]);
    }
    // The house’s Oracle acts as a person: an org they are not in is refused by the till.
    const house = await answerConsent(
      desk,
      asker(true),
      post(body({ accountId: OTHER })),
      same,
      relay,
      quiet,
      draw,
    );
    expect([house.status, (await house.json()).refusal]).toEqual([403, 'till']);
  });

  it('a till that is not bound is unavailable (503); one that throws failed (502)', async () => {
    const notBound = {
      agents: vi.fn(async () => {
        throw new Error(`AccountDesk ${NOT_IMPLEMENTED} agents`);
      }),
    } as unknown as AccountDesk;
    const unbound = await answerConsent(notBound, asker(), post(body()), same, relay, quiet, draw);
    expect([unbound.status, (await unbound.json()).refusal]).toEqual([503, 'unavailable']);
    const down = {
      agents: vi.fn(async () => Promise.reject(new Error('down'))),
    } as unknown as AccountDesk;
    const failed = await answerConsent(down, asker(), post(body()), same, relay, quiet, draw);
    expect([failed.status, (await failed.json()).refusal]).toEqual([502, 'failed']);
  });
});
