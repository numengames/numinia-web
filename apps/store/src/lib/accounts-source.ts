/**
 * «Saldo»'s door to the till. Server only — no island imports it, so it may
 * use zod. Mirror of lib/prices-source.ts.
 *
 * Trust model. The till (apps/till, Worker `numinia-till`) is reachable
 * from nowhere but this Worker's service binding `TILL_ACCOUNTS` (root
 * wrangler.jsonc), bound to its named RPC entrypoint `AccountDesk`: an RPC
 * entrypoint has no URL, so the desk cannot be reached from the internet.
 * The API routes read the SESSION first — our own signed cookie, any rank —
 * and pass the session's wallet, lowercased, as the first argument of every
 * call. The till trusts its one bound caller for WHO and decides itself
 * WHAT that wallet may do (membership), re-validating every field. Neither
 * of us trusts a browser: what it sends is checked for shape before the
 * till sees it, what the till answers is checked before the browser sees
 * it, and the way back from Stripe is built here from the request's own
 * origin, never taken from the body. Logs name rules, never wallets or
 * amounts.
 */

import { z } from 'zod';
import {
  ORGANIZATION_PERMISSIONS,
  SUPPORTED_LOCALES,
  needsFreshSignature,
  type OrganizationPermission,
  type SupportedLocale,
} from '@numinia/domain';
import deskSeed from '../../fixtures/accounts/desk.json';
import {
  DESK_METHODS,
  SPEND_RANGES,
  TOPUP_KEYS,
  FRESH_SIGNATURE,
  checkoutTarget,
  isSpendRange,
  vueltaBase,
  type AccountDesk,
  type DeskRoleChange,
  type DeskRoleDraft,
  type SpendRange,
} from './accounts';
import { createAccountsFixtureDesk, type AccountsSeed } from './accounts-fixture';
import { logEvent } from './telemetry';

/** The desk read off whatever workerd bound: its eighteen methods, or null when it is not a desk. */
export function boundAccounts(binding: unknown): AccountDesk | null {
  if (binding === null || (typeof binding !== 'object' && typeof binding !== 'function')) {
    return null;
  }
  const desk = binding as Partial<Record<keyof AccountDesk, unknown>>;
  if (!DESK_METHODS.every((method) => typeof desk[method] === 'function')) return null;
  // Called as methods of the stub (never detached): an RPC stub needs its receiver.
  const stub = binding as AccountDesk;
  return {
    overview: (wallet) => stub.overview(wallet),
    createTeam: (wallet, name) => stub.createTeam(wallet, name),
    renameTeam: (wallet, accountId, name) => stub.renameTeam(wallet, accountId, name),
    statement: (wallet, accountId, range) => stub.statement(wallet, accountId, range),
    members: (wallet, accountId) => stub.members(wallet, accountId),
    access: (wallet, accountId) => stub.access(wallet, accountId),
    setMember: (wallet, accountId, member, role) => stub.setMember(wallet, accountId, member, role),
    removeMember: (wallet, accountId, member) => stub.removeMember(wallet, accountId, member),
    roles: (wallet, accountId) => stub.roles(wallet, accountId),
    createRole: (wallet, accountId, role) => stub.createRole(wallet, accountId, role),
    editRole: (wallet, accountId, roleId, change) =>
      stub.editRole(wallet, accountId, roleId, change),
    moveRole: (wallet, accountId, roleId, position) =>
      stub.moveRole(wallet, accountId, roleId, position),
    deleteRole: (wallet, accountId, roleId) => stub.deleteRole(wallet, accountId, roleId),
    giveRole: (wallet, accountId, member, roleId) =>
      stub.giveRole(wallet, accountId, member, roleId),
    takeRole: (wallet, accountId, member, roleId) =>
      stub.takeRole(wallet, accountId, member, roleId),
    log: (wallet, accountId) => stub.log(wallet, accountId),
    startTopup: (wallet, accountId, key, returnBase) =>
      stub.startTopup(wallet, accountId, key, returnBase),
    confirmTopup: (wallet, sessionId) => stub.confirmTopup(wallet, sessionId),
  };
}

let fixture: AccountDesk | null = null;

/** The fixture desk, one per server process, so a top-up stays until it stops. */
export function fixtureAccounts(): AccountDesk {
  fixture ??= createAccountsFixtureDesk(deskSeed as unknown as AccountsSeed);
  return fixture;
}

/** Test seam: a fresh fixture desk for the next scenario. */
export function resetFixtureAccountsForTests(): void {
  fixture = null;
}

export interface AccountsEnv {
  /** What workerd bound as TILL_ACCOUNTS (runtimeBinding). */
  readonly binding: unknown;
  /** DATA_SOURCE, frozen at build: `fixture` in CI, acceptance and screenshots. */
  readonly dataSource: string | undefined;
}

/**
 * The desk to ask: the bound till first, then the fixture desk when the
 * build reads fixtures, else null — the routes answer 503 `not-bound`.
 */
export function accountsFrom(env: AccountsEnv): AccountDesk | null {
  return boundAccounts(env.binding) ?? (env.dataSource === 'fixture' ? fixtureAccounts() : null);
}

// ---- Shapes (built on first use, never at import) ---------------------------

/** Bytes a POST may carry: an action and a few short fields. */
export const MAX_BODY_BYTES = 4_096;
const ID_MAX = 100;

function buildSchemas() {
  const id = z.string().min(1).max(ID_MAX);
  // A wallet in the browser's own case; the till wants it lowercase.
  const wallet = z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, 'a wallet is 0x and 40 hex digits')
    .transform((text) => text.toLowerCase());
  const role = z.enum(['admin', 'member']);
  // The name's real rule (1 to 60 characters, trimmed) is the till's to judge.
  const name = z.string().max(200);
  const roleId = z.string().regex(/^role_[0-9a-f]{16}$/, 'a role id');
  const permission = z.enum(ORGANIZATION_PERMISSIONS);
  const color = z.string().regex(/^#[0-9a-f]{6}$/, '#rrggbb in lower case');
  // A role's name rules (1 to 100, no control characters) are the till's to judge.
  const roleName = z.string().max(400);
  const draft = z
    .object({
      name: roleName,
      color: color.nullable(),
      hoist: z.boolean(),
      permissions: z.array(permission).max(ORGANIZATION_PERMISSIONS.length),
    })
    .strict();
  const change = z
    .object({
      name: roleName.optional(),
      color: color.nullable().optional(),
      hoist: z.boolean().optional(),
      permissions: z.array(permission).max(ORGANIZATION_PERMISSIONS.length).optional(),
    })
    .strict();
  const request = z.discriminatedUnion('action', [
    z
      .object({
        action: z.literal('topup'),
        accountId: id,
        amount: z.enum(TOPUP_KEYS as readonly ['10', '50', '100']),
        locale: z.enum(SUPPORTED_LOCALES),
      })
      .strict(),
    z
      .object({
        action: z.literal('confirm'),
        sessionId: z.string().regex(/^cs_[A-Za-z0-9_]{1,250}$/),
      })
      .strict(),
    z.object({ action: z.literal('create-team'), name }).strict(),
    z.object({ action: z.literal('rename'), accountId: id, name }).strict(),
    z.object({ action: z.literal('set-member'), accountId: id, wallet, role }).strict(),
    z.object({ action: z.literal('remove-member'), accountId: id, wallet }).strict(),
    z.object({ action: z.literal('create-role'), accountId: id, role: draft }).strict(),
    z.object({ action: z.literal('edit-role'), accountId: id, roleId, change }).strict(),
    z
      .object({
        action: z.literal('move-role'),
        accountId: id,
        roleId,
        position: z.number().int().min(1).max(1000),
      })
      .strict(),
    z.object({ action: z.literal('delete-role'), accountId: id, roleId }).strict(),
    z.object({ action: z.literal('give-role'), accountId: id, wallet, roleId }).strict(),
    z.object({ action: z.literal('take-role'), accountId: id, wallet, roleId }).strict(),
  ]);

  // The till's answers: extra fields are dropped, missing or mistyped ones refused.
  const refusal = z.object({ ok: z.literal(false), problems: z.array(z.string()) });
  const account = z.object({
    id: z.string(),
    kind: z.enum(['personal', 'team']),
    name: z.string().nullable(),
    role: z.enum(['owner', 'admin', 'member']),
    balanceCents: z.number(),
  });
  const member = z.object({ wallet: z.string(), role, addedAt: z.string() });
  const line = z.object({
    kind: z.enum(['topup', 'world_day', 'adjustment', 'refund', 'chargeback']),
    at: z.string(),
    amountCents: z.number(),
    vatCents: z.number().nullish(),
    day: z.string().nullish(),
    worldId: z.string().nullish(),
    size: z.string().nullish(),
    reason: z.string().nullish(),
  });
  const overview = z.union([z.object({ accounts: z.array(account) }), refusal]);
  const statement = z.union([
    z.object({
      account,
      balanceCents: z.number(),
      lowBalance: z.boolean(),
      lots: z.array(
        z.object({
          lineId: z.string(),
          at: z.string(),
          amountCents: z.number(),
          remainderCents: z.number(),
        }),
      ),
      spend: z.array(z.object({ bucket: z.string(), cents: z.number() })),
      spendTotalCents: z.number(),
      lines: z.array(line),
      members: z.array(member).optional(),
    }),
    refusal,
  ]);
  const team = z.union([z.object({ ok: z.literal(true), account }), refusal]);
  const members = z.union([
    z.object({ ok: z.literal(true), members: z.array(member).optional() }),
    refusal,
  ]);
  const access = z.union([
    z.object({
      ok: z.literal(true),
      as: z.enum(['owner', 'house', 'member']),
      permissions: z.array(z.string()),
      holders: z.record(z.string(), z.array(z.string())),
    }),
    refusal,
  ]);
  const roleDetail = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    position: z.number(),
    hoist: z.boolean(),
    permissions: z.array(permission),
    members: z.number(),
    mayEdit: z.boolean(),
  });
  const memberDetail = z.object({
    wallet: z.string(),
    owner: z.boolean(),
    addedAt: z.string(),
    roleIds: z.array(z.string()),
    assignable: z.array(z.string()),
  });
  const roles = z.union([
    z.object({
      ok: z.literal(true),
      accountId: z.string(),
      as: z.enum(['owner', 'house', 'member']),
      roles: z.array(roleDetail),
      members: z.array(memberDetail),
    }),
    refusal,
  ]);
  const logLine = z.object({
    seq: z.number(),
    at: z.string(),
    actor: z.string(),
    asHouse: z.boolean(),
    act: z.string(),
    subject: z.string().nullable(),
    detail: z.record(z.string(), z.string()).nullable(),
  });
  const log = z.union([
    z.object({ ok: z.literal(true), accountId: z.string(), lines: z.array(logLine) }),
    refusal,
  ]);
  const topup = z.union([z.object({ ok: z.literal(true), url: z.string() }), refusal]);
  const confirm = z.union([
    z.object({
      ok: z.literal(true),
      state: z.enum(['paid', 'open', 'expired']),
      accountId: z.string(),
      balanceCents: z.number(),
    }),
    refusal,
  ]);
  return { request, overview, statement, team, members, access, roles, log, topup, confirm };
}

let schemas: ReturnType<typeof buildSchemas> | null = null;
function shapes(): ReturnType<typeof buildSchemas> {
  schemas ??= buildSchemas();
  return schemas;
}

export type SaldoRequest =
  | {
      readonly action: 'topup';
      readonly accountId: string;
      readonly amount: '10' | '50' | '100';
      readonly locale: SupportedLocale;
    }
  | { readonly action: 'confirm'; readonly sessionId: string }
  | { readonly action: 'create-team'; readonly name: string }
  | { readonly action: 'rename'; readonly accountId: string; readonly name: string }
  | {
      readonly action: 'set-member';
      readonly accountId: string;
      readonly wallet: string;
      readonly role: 'admin' | 'member';
    }
  | { readonly action: 'remove-member'; readonly accountId: string; readonly wallet: string }
  | { readonly action: 'create-role'; readonly accountId: string; readonly role: DeskRoleDraft }
  | {
      readonly action: 'edit-role';
      readonly accountId: string;
      readonly roleId: string;
      readonly change: DeskRoleChange;
    }
  | {
      readonly action: 'move-role';
      readonly accountId: string;
      readonly roleId: string;
      readonly position: number;
    }
  | { readonly action: 'delete-role'; readonly accountId: string; readonly roleId: string }
  | {
      readonly action: 'give-role';
      readonly accountId: string;
      readonly wallet: string;
      readonly roleId: string;
    }
  | {
      readonly action: 'take-role';
      readonly accountId: string;
      readonly wallet: string;
      readonly roleId: string;
    };

/** The browser's POST body, read: one action shaped like the contract's, or the first issue. */
export function readSaldoRequest(
  json: unknown,
):
  | { readonly ok: true; readonly request: SaldoRequest }
  | { readonly ok: false; readonly error: string } {
  const parsed = shapes().request.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue === undefined || issue.path.length === 0 ? '' : `${issue.path.join('.')}: `;
    return { ok: false, error: `${where}${issue?.message ?? 'invalid'}` };
  }
  return { ok: true, request: parsed.data as SaldoRequest };
}

// ---- Answers ---------------------------------------------------------------

type Log = (event: Readonly<Record<string, unknown>>) => void;

const HEADERS = { 'cache-control': 'no-store' } as const;
const answer = (body: unknown, status = 200): Response =>
  Response.json(body, { status, headers: HEADERS });
const signedOut = (): Response => answer({ error: 'signed-out' }, 401);
const notBound = (): Response => answer({ error: 'not-bound' }, 503);
const refused = (problems: readonly string[]): Response =>
  answer({ error: 'refused', problems }, 403);

/** A desk that threw, or answered out of shape: logged by rule, never by value. */
function failed(log: Log, action: string, rule: string, error?: unknown): Response {
  log({
    level: 'error',
    kind: 'saldo-till',
    action,
    rule,
    ...(error === undefined ? {} : { error: error instanceof Error ? error.name : typeof error }),
  });
  return answer({ error: 'till-failed' }, 502);
}

/** Ask the desk and check its answer's shape: the answer, or the failure to send. */
async function ask<T>(
  log: Log,
  action: string,
  call: () => Promise<unknown>,
  shape: z.ZodType<T>,
): Promise<
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly response: Response }
> {
  let raw: unknown;
  try {
    raw = await call();
  } catch (error) {
    return { ok: false, response: failed(log, action, 'threw', error) };
  }
  const parsed = shape.safeParse(raw);
  if (!parsed.success) return { ok: false, response: failed(log, action, 'answer-shape') };
  return { ok: true, value: parsed.data };
}

/** GET /api/saldo: the accounts this wallet sees, personal first. */
export async function answerOverview(
  desk: AccountDesk | null,
  wallet: string | null,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  if (desk === null) return notBound();
  const asked = await ask(
    log,
    'overview',
    () => desk.overview(wallet.toLowerCase()),
    shapes().overview,
  );
  if (!asked.ok) return asked.response;
  const overview = asked.value;
  if ('ok' in overview) return refused(overview.problems);
  return answer({ accounts: overview.accounts });
}

/** GET /api/saldo/statement?cuenta=&rango=: one account's statement and, for an organization, what the wallet may do there; members only. */
export async function answerStatement(
  desk: AccountDesk | null,
  wallet: string | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  const account = url.searchParams.get('cuenta') ?? '';
  const rango = url.searchParams.get('rango') ?? '30d';
  if (account.length === 0 || account.length > ID_MAX) {
    return answer({ error: 'cuenta: an account id is required' }, 400);
  }
  if (!isSpendRange(rango)) {
    return answer({ error: `rango: one of ${SPEND_RANGES.join(', ')}` }, 400);
  }
  if (desk === null) return notBound();
  const you = wallet.toLowerCase();
  const range: SpendRange = rango;
  const asked = await ask(
    log,
    'statement',
    () => desk.statement(you, account, range),
    shapes().statement,
  );
  if (!asked.ok) return asked.response;
  const statement = asked.value;
  if ('ok' in statement) return refused(statement.problems);
  if (statement.account.kind === 'personal') return answer({ statement, you, access: null });
  // What this wallet may do here: the screen hides the rest. A desk that
  // cannot say leaves the controls shown (null) — the till refuses on every write.
  const allowed = await ask(log, 'access', () => desk.access(you, account), shapes().access);
  const access =
    allowed.ok && !('problems' in allowed.value)
      ? {
          as: allowed.value.as,
          permissions: allowed.value.permissions,
          holders: allowed.value.holders,
        }
      : null;
  return answer({ statement, you, access });
}

/** The account a GET names (`?cuenta=`), or the answer that refuses it. */
function accountOf(url: URL): { ok: true; account: string } | { ok: false; response: Response } {
  const account = url.searchParams.get('cuenta') ?? '';
  if (account.length === 0 || account.length > ID_MAX) {
    return { ok: false, response: answer({ error: 'cuenta: an account id is required' }, 400) };
  }
  return { ok: true, account };
}

/** GET /api/saldo/roles?cuenta=: an organization's roles and members, as this wallet may handle them. */
export async function answerRoles(
  desk: AccountDesk | null,
  wallet: string | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  const named = accountOf(url);
  if (!named.ok) return named.response;
  if (desk === null) return notBound();
  const you = wallet.toLowerCase();
  const asked = await ask(log, 'roles', () => desk.roles(you, named.account), shapes().roles);
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ roles: asked.value, you });
}

/** GET /api/saldo/log?cuenta=: the organization's last changes, for whoever may view its log. */
export async function answerLog(
  desk: AccountDesk | null,
  wallet: string | null,
  url: URL,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  const named = accountOf(url);
  if (!named.ok) return named.response;
  if (desk === null) return notBound();
  const you = wallet.toLowerCase();
  const asked = await ask(log, 'log', () => desk.log(you, named.account), shapes().log);
  if (!asked.ok) return asked.response;
  if ('problems' in asked.value) return refused(asked.value.problems);
  return answer({ log: asked.value });
}

/** Read a POST's JSON body within limits, or the answer that refuses it. */
async function bodyOf(
  request: Request,
): Promise<{ ok: true; json: unknown } | { ok: false; response: Response }> {
  const type = (request.headers.get('content-type') ?? '').trim().toLowerCase();
  if (!/^application\/json\s*(;|$)/.test(type)) {
    return { ok: false, response: answer({ error: 'content-type must be application/json' }, 415) };
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > MAX_BODY_BYTES)
    return { ok: false, response: answer({ error: 'body too large' }, 413) };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { ok: false, response: answer({ error: 'body too large' }, 413) };
  }
  try {
    return { ok: true, json: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: answer({ error: 'body must be JSON' }, 400) };
  }
}

/**
 * POST /api/saldo: one action on the desk as the session's wallet. The
 * desk's refusals travel as values (`{ result: { ok: false, problems } }`,
 * 200): the screen tells the person why; only a desk that failed is 502.
 */
export async function answerAction(
  desk: AccountDesk | null,
  wallet: string | null,
  request: Request,
  log: Log = logEvent,
): Promise<Response> {
  if (wallet === null) return signedOut();
  const body = await bodyOf(request);
  if (!body.ok) return body.response;
  const read = readSaldoRequest(body.json);
  if (!read.ok) return answer({ error: read.error }, 400);
  if (desk === null) return notBound();
  const you = wallet.toLowerCase();
  const s = shapes();
  const action = read.request;

  if (action.action === 'topup') {
    const origin = new URL(request.url).origin;
    const asked = await ask(
      log,
      'topup',
      () =>
        desk.startTopup(you, action.accountId, action.amount, vueltaBase(origin, action.locale)),
      s.topup,
    );
    if (!asked.ok) return asked.response;
    const result = asked.value;
    if (result.ok) {
      // Only Stripe's Checkout or this site's own way back may reach the new tab.
      const url = checkoutTarget(result.url, origin);
      if (url === null) return failed(log, 'topup', 'checkout-url');
      log({ level: 'info', kind: 'saldo-topup', outcome: 'opened' });
      return answer({ result: { ok: true, url } });
    }
    log({ level: 'info', kind: 'saldo-topup', outcome: 'refused' });
    return answer({ result });
  }

  if (action.action === 'confirm') {
    const asked = await ask(
      log,
      'confirm',
      () => desk.confirmTopup(you, action.sessionId),
      s.confirm,
    );
    if (!asked.ok) return asked.response;
    const result = asked.value;
    log({ level: 'info', kind: 'saldo-confirm', outcome: result.ok ? result.state : 'refused' });
    return answer({ result });
  }

  if (
    action.action === 'create-role' ||
    action.action === 'edit-role' ||
    action.action === 'give-role' ||
    action.action === 'take-role' ||
    action.action === 'move-role' ||
    action.action === 'delete-role'
  ) {
    return answerRoleAction(desk, you, action, log);
  }

  const asked =
    action.action === 'create-team'
      ? await ask(log, action.action, () => desk.createTeam(you, action.name), s.team)
      : action.action === 'rename'
        ? await ask(
            log,
            action.action,
            () => desk.renameTeam(you, action.accountId, action.name),
            s.team,
          )
        : action.action === 'set-member'
          ? await ask(
              log,
              action.action,
              () => desk.setMember(you, action.accountId, action.wallet, action.role),
              s.members,
            )
          : await ask(
              log,
              action.action,
              () => desk.removeMember(you, action.accountId, action.wallet),
              s.members,
            );
  if (!asked.ok) return asked.response;
  return answer({ result: asked.value });
}

type RoleAction = Extract<
  SaldoRequest,
  {
    readonly action:
      'create-role' | 'edit-role' | 'move-role' | 'delete-role' | 'give-role' | 'take-role';
  }
>;

/** The permissions a request would ADD that ask for a new wallet signature (STD-051, ORG-008). */
async function sensitiveGrant(
  desk: AccountDesk,
  you: string,
  action: RoleAction,
  log: Log,
): Promise<
  | { readonly ok: true; readonly grants: boolean }
  | { readonly ok: false; readonly response: Response }
> {
  if (action.action === 'create-role') {
    return {
      ok: true,
      grants: needsFreshSignature({ kind: 'grant', permissions: action.role.permissions }),
    };
  }
  if (action.action !== 'edit-role' && action.action !== 'give-role')
    return { ok: true, grants: false };
  if (action.action === 'edit-role' && action.change.permissions === undefined) {
    return { ok: true, grants: false };
  }
  const asked = await ask(log, 'roles', () => desk.roles(you, action.accountId), shapes().roles);
  if (!asked.ok) return asked;
  // A desk that refuses to say lets the write through to the same refusal: nothing is written.
  if ('problems' in asked.value) return { ok: true, grants: false };
  const held: readonly OrganizationPermission[] =
    asked.value.roles.find((role) => role.id === action.roleId)?.permissions ?? [];
  const added =
    action.action === 'give-role'
      ? held
      : (action.change.permissions ?? []).filter((permission) => !held.includes(permission));
  return {
    ok: true,
    grants: needsFreshSignature({ kind: 'grant', permissions: added }),
  };
}

/** A role action on the desk; granting administrator or manage-roles is refused until the screen can ask for a fresh signature. */
async function answerRoleAction(
  desk: AccountDesk,
  you: string,
  action: RoleAction,
  log: Log,
): Promise<Response> {
  const gate = await sensitiveGrant(desk, you, action, log);
  if (!gate.ok) return gate.response;
  if (gate.grants) {
    log({ level: 'info', kind: 'saldo-role', action: action.action, outcome: 'needs-signature' });
    return answer({ result: { ok: false, problems: [FRESH_SIGNATURE] } });
  }
  const s = shapes();
  const asked =
    action.action === 'create-role'
      ? await ask(
          log,
          action.action,
          () => desk.createRole(you, action.accountId, action.role),
          s.roles,
        )
      : action.action === 'edit-role'
        ? await ask(
            log,
            action.action,
            () => desk.editRole(you, action.accountId, action.roleId, action.change),
            s.roles,
          )
        : action.action === 'move-role'
          ? await ask(
              log,
              action.action,
              () => desk.moveRole(you, action.accountId, action.roleId, action.position),
              s.roles,
            )
          : action.action === 'delete-role'
            ? await ask(
                log,
                action.action,
                () => desk.deleteRole(you, action.accountId, action.roleId),
                s.roles,
              )
            : action.action === 'give-role'
              ? await ask(
                  log,
                  action.action,
                  () => desk.giveRole(you, action.accountId, action.wallet, action.roleId),
                  s.roles,
                )
              : await ask(
                  log,
                  action.action,
                  () => desk.takeRole(you, action.accountId, action.wallet, action.roleId),
                  s.roles,
                );
  if (!asked.ok) return asked.response;
  log({
    level: 'info',
    kind: 'saldo-role',
    action: action.action,
    outcome: asked.value.ok ? 'done' : 'refused',
  });
  return answer({ result: asked.value });
}
