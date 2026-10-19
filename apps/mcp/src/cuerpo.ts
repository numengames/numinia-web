/**
 * Cuerpo — an organization's AI's body in ONE world (DISENO-MCP-REMOTO
 * §2 (a)(c)(e), story W8). One Durable Object per AI, named
 * `<organization>.<agent>` (the grant's `userId`, {@link bodyOf}), that
 * holds the outbound WebSocket to the world the way the engine's bridge
 * holds it on someone's PC: it RUNS that bridge, vendored from the engine
 * (`vendor/puente-mundo.mjs`, story M1), so the world sees what it always
 * sees — an organization's AI entering with a numinia.com pass (H3b).
 *
 * - `entrar`: asks numinia.com who the AI is (`GET /api/agents/me`, me.ts)
 *   for its standing and the world's `ws`, takes one of its organization's
 *   seats (plazas.ts: at most 3 bodies at once), asks for a 10-minute pass
 *   with the AI's token (`POST /api/agents/pass`, Bearer — the bridge's own
 *   `pedirPaseToken`), opens the WebSocket and enters with PASE. The bridge
 *   renews the pass 8 minutes after each one, before it ends.
 * - `salir`: leaves; every timer stops (the bridge's 20 Hz clock and pass
 *   renewal, this object's alarm), so workerd may evict the object.
 * - `usar`: what each MCP call made through the body calls (story W9,
 *   herramientas-cuerpo.ts): it keeps the body from idling out, hands it the
 *   newest token and, given a world tool, runs it through the bridge's own
 *   MCP server (`ServidorMcp`: the tool's schema checked, the world's
 *   refusals kept as the answer, untrusted world text inside `<material>`).
 *
 * Rules: a body leaves by itself after 10 minutes without MCP calls; it
 * asks `/me` at most once a minute (each beat, and on `entrar`); a
 * `401` from numinia.com (on `/me` or on a pass) means the token was
 * revoked or renewed: the body leaves and revokes the OAuth grant it came
 * with (`revokeGrant`, the library's helpers built from the Worker's own
 * options). Switched off, without anyone answering for it or without the
 * permission, it leaves; asleep (dormida) it stays, and the bridge keeps to
 * what its pass allows (no building, speaking only when called).
 *
 * While inside, an alarm every minute checks all that, renews the seat and
 * adds the minute to the organization's body time (plazas.ts). The bridge's
 * 20 Hz clock keeps the object awake (no hibernation): that cost is
 * accepted and priced (§2 (e)). The AI's token lives only in memory, never
 * in storage, a log or an answer; a body whose object was evicted is gone,
 * and the next alarm of the new instance only frees its seat.
 *
 * `oir` stays off for AIs connected by URL ({@link URL_AIS_HEAR}): the
 * world tools a body runs come through {@link worldTools}, without it, and
 * what the bridge hears is dropped every minute. What it may place is the
 * house's library (biblioteca.ts).
 */
import { getOAuthApi } from '@cloudflare/workers-oauth-provider';
import { DurableObject } from 'cloudflare:workers';
import { z } from 'zod';
import {
  PuenteMundo,
  ServidorMcp,
  estadoDelPase,
  pedirPaseToken,
  type HerramientaMcp,
  type RespuestaPase,
} from '../vendor/puente-mundo.mjs';
import { HOUSE_LIBRARY } from './biblioteca';
import { storeFetch, storeOrigin, type Env } from './env';
import { standingOf } from './herramientas';
import { askMe, type MeAnswer, type MeAsk } from './me';
import type { Plazas } from './plazas';
import { PROVIDER_OPTIONS } from './provider';
import { grantUserId } from './vuelta';

/** While a body is inside, its alarm rings this often. */
export const BEAT_MS = 60_000;
/** A body leaves by itself after this long without MCP calls. */
export const IDLE_MS = 10 * 60_000;
/** A body asks numinia.com's `/me` at most this often. */
export const ME_EVERY_MS = 60_000;
/** `entrar` waits this long for numinia.com's first pass. */
export const FIRST_PASS_MS = 10_000;
/** Bridge log lines kept for `estado` (scrubbed of the token). */
export const NOTES_MAX = 20;

/**
 * The house's switch (W3's `URL_AIS_HEAR`): AIs connected by URL do not
 * hear nearby chat until the lawyers validate it (Pablo, P3).
 */
export const URL_AIS_HEAR = false;
/** The bridge's hearing tool. */
export const HEAR_TOOL = 'oir';

const BODY_KEY = 'body';

const propsShape = z.object({
  accountId: z.string().min(1).max(200),
  agentId: z.string().min(1).max(200),
  token: z.string().regex(/^ntk_[A-Za-z0-9_-]{43}$/),
});
const grantShape = z.object({ grantId: z.string().min(1), userId: z.string().min(1) });
const enterShape = z.object({
  props: propsShape,
  mundo: z.string().min(1).max(200),
  grant: grantShape.optional(),
});
const toolShape = z.object({ name: z.string().min(1).max(64), arguments: z.unknown() });
const useShape = z.object({
  props: propsShape,
  grant: grantShape.optional(),
  tool: toolShape.optional(),
});
/** What the bridge's MCP server answers a `tools/call` with. */
const toolReply = z.object({
  result: z.object({
    content: z.array(z.object({ text: z.string() })).min(1),
    isError: z.boolean().optional(),
  }),
});

/** The grant a body came with: what to revoke when numinia.com says `401`. */
export type BodyGrant = z.infer<typeof grantShape>;
/** What `entrar` takes: the grant's props, the world's id (from `mundos`) and the grant. */
export type EnterAsk = z.input<typeof enterShape>;
/** What `usar` takes: the grant's props, the grant and, for a world tool, its name and arguments. */
export type UseAsk = z.input<typeof useShape>;

/** Why a body could not do what it was asked. */
export type Refusal =
  | 'input'
  | 'unconfigured'
  | 'other-ai'
  | 'not-inside'
  | 'revoked'
  | 'busy'
  | 'down'
  | 'odd'
  | 'refused'
  | 'apagada'
  | 'sin-responsable'
  | 'sin-permiso'
  | 'no-world'
  | 'full';

/** Why a body left. */
export type LeaveReason =
  | 'salir'
  | 'idle'
  | 'revoked'
  | 'apagada'
  | 'sin-responsable'
  | 'sin-permiso'
  | 'world-gone'
  | 'world-closed'
  | 'seat-lost'
  | 'other-world'
  | 'refused'
  | 'down'
  | 'evicted';

export const REFUSALS: Record<Refusal, string> = {
  input: 'That is not a body request this server understands.',
  unconfigured: 'This server cannot take bodies into worlds right now (it is not configured).',
  'other-ai': 'This body belongs to another AI.',
  'not-inside':
    'You are not in any world yet: enter one first with «entrar» {"mundo": "<id>"} (the ids come from «mundos»).',
  revoked:
    'This connection has ended: your token was revoked or renewed on numinia.com (Panel › Agents). Your app has to connect again.',
  busy: 'Too many requests for this AI right now (numinia.com allows 60 a minute). Wait a minute, then try again.',
  down: 'numinia.com did not answer. Try again in a minute.',
  odd: 'numinia.com answered something this server does not understand. Try again later.',
  refused:
    'numinia.com gave you no pass for that world (is it still your organization’s?). Call «mundos» and try again.',
  apagada:
    'You are switched off: you enter no world. A person of your organization can switch you on in Panel › Agents on numinia.com.',
  'sin-responsable':
    'No one answers for you in your organization: you enter no world until someone does.',
  'sin-permiso': 'Your roles do not let you into the worlds.',
  'no-world': 'Your organization has no world with that id on now. Call «mundos» for the list.',
  full: 'Your organization already has 3 AIs inside worlds, the most at once. Try again when one leaves.',
};

/** What a world tool answered: the bridge's text, and whether it is a refusal. */
export interface ToolOutcome {
  readonly text: string;
  readonly isError: boolean;
}

/** What `entrar` and `usar` answer; `result` when `usar` ran a world tool. */
export type BodyAnswer =
  | {
      readonly ok: true;
      readonly world: string;
      readonly state: 'activa' | 'dormida' | null;
      readonly text: string;
      readonly result?: ToolOutcome;
    }
  | { readonly ok: false; readonly reason: Refusal; readonly text: string };

/** What `salir` answers: whether there was a body, where, and how long it was inside. */
export interface LeaveAnswer {
  readonly left: boolean;
  readonly world: string | null;
  readonly seconds: number;
}

/** What `estado` answers; never a token or a pass. */
export interface BodyStatus {
  readonly inside: {
    readonly world: string;
    readonly since: number;
    readonly state: 'activa' | 'dormida' | null;
    readonly connected: boolean;
  } | null;
  readonly left: { readonly reason: LeaveReason; readonly at: number } | null;
  readonly notes: readonly string[];
}

/** What a body keeps in storage: enough to free its seat after an eviction. No token. */
interface Saved {
  readonly org: string;
  readonly agent: string;
  readonly world: string;
  readonly since: number;
  readonly counted: number;
}

const PASS_REFUSAL = {
  token: 'revoked',
  apagada: 'apagada',
  rechazado: 'refused',
  red: 'down',
} as const satisfies Record<string, Refusal & LeaveReason>;

const ME_REFUSAL = {
  busy: 'busy',
  down: 'down',
  malformed: 'odd',
  refused: 'odd',
} as const satisfies Record<string, Refusal>;

/** An answer from inside a world. */
type Inside = Extract<BodyAnswer, { ok: true }>;

/** A call `usar` let through: the body, and the world tool to run, if any. */
interface InUse {
  readonly body: Body;
  readonly tool: { readonly name: string; readonly arguments: unknown } | null;
}

const refuse = (reason: Refusal): BodyAnswer => ({ ok: false, reason, text: REFUSALS[reason] });
const ignore = (): undefined => undefined;

/** The world tools a URL-connected AI may use: the bridge's, without hearing while the switch is off. */
export function worldTools(bridge: PuenteMundo, hear: boolean = URL_AIS_HEAR): HerramientaMcp[] {
  return bridge.herramientas().filter((tool) => hear || tool.name !== HEAR_TOOL);
}

/** The body of one AI (story W9 calls it per MCP request); null when the relay has no binding. */
export function bodyOf(
  env: Env,
  accountId: string,
  agentId: string,
): DurableObjectStub<Cuerpo> | null {
  return env.CUERPO === undefined ? null : env.CUERPO.getByName(grantUserId(accountId, agentId));
}

interface BodyHooks {
  pass(body: Body, aud: string): Promise<RespuestaPase>;
  note(body: Body, line: string): void;
}

/** One stay in one world: the bridge and the bookkeeping around it (memory only). */
class Body {
  readonly org: string;
  readonly agent: string;
  readonly world: string;
  readonly store: string;
  readonly desk: DurableObjectStub<Plazas>;
  readonly since: number;
  readonly bridge: PuenteMundo;
  token: string;
  grant: BodyGrant | null;
  counted: number;
  lastCall: number;
  firstPass: ((answer: RespuestaPase | null) => void) | null = null;

  constructor(o: {
    me: MeAsk;
    world: string;
    ws: string;
    store: string;
    desk: DurableObjectStub<Plazas>;
    grant: BodyGrant | null;
    now: number;
    hooks: BodyHooks;
  }) {
    this.org = o.me.accountId;
    this.agent = o.me.agentId;
    this.token = o.me.token;
    this.world = o.world;
    this.store = o.store;
    this.desk = o.desk;
    this.grant = o.grant;
    this.since = o.now;
    this.counted = o.now;
    this.lastCall = o.now;
    this.bridge = new PuenteMundo({
      url: o.ws,
      id: o.me.agentId,
      mundo: o.world,
      biblioteca: HOUSE_LIBRARY,
      pedirPase: (aud) => o.hooks.pass(this, aud),
      log: (line) => o.hooks.note(this, line),
    });
  }

  saved(): Saved {
    return {
      org: this.org,
      agent: this.agent,
      world: this.world,
      since: this.since,
      counted: this.counted,
    };
  }
}

export class Cuerpo extends DurableObject<Env> {
  private inside: Body | null = null;
  private left: BodyStatus['left'] = null;
  private readonly notes: string[] = [];
  /** The last `/me` answer, for the token it was asked with: asked again only after a minute. */
  private me: { readonly at: number; readonly token: string; readonly answer: MeAnswer } | null =
    null;
  private chain: Promise<unknown> = Promise.resolve();

  /** Take the AI into one world (out of the one it is in, if another). */
  async entrar(input: unknown): Promise<BodyAnswer> {
    return this.serial(() => this.enter(input));
  }

  /** Leave the world, if inside one. */
  async salir(): Promise<LeaveAnswer> {
    return this.serial(async () => {
      const body = this.inside;
      if (body === null) return { left: false, world: null, seconds: 0 };
      const seconds = await this.end(body, 'salir');
      return { left: true, world: body.world, seconds };
    });
  }

  /**
   * One MCP call through the body (story W9): it is in use, with this
   * token; given a world tool, the bridge runs it. The tool runs outside
   * this object's queue, so a slow world (a build waits for its answer)
   * holds up neither the alarm nor another call.
   */
  async usar(input: unknown): Promise<BodyAnswer> {
    const used = await this.serial(async (): Promise<BodyAnswer | InUse> => {
      const parsed = useShape.safeParse(input);
      if (!parsed.success) return refuse('input');
      const body = this.inside;
      if (body === null) return refuse('not-inside');
      if (!owns(body, parsed.data.props)) return refuse('other-ai');
      this.touch(body, parsed.data.props.token, parsed.data.grant ?? null);
      return { body, tool: parsed.data.tool ?? null };
    });
    if (!('body' in used)) return used;
    const answer = inAnswer(used.body, `You are in «${used.body.world}».`);
    if (used.tool === null) return answer;
    return { ...answer, result: await this.run(used.body, used.tool.name, used.tool.arguments) };
  }

  /** Where the body is and why it last left; never a token or a pass. */
  async estado(): Promise<BodyStatus> {
    const body = this.inside;
    return {
      inside:
        body === null
          ? null
          : {
              world: body.world,
              since: body.since,
              state: body.bridge.estado,
              connected: body.bridge.conectado && body.bridge.cuerpo?.nombre != null,
            },
      left: this.left,
      notes: [...this.notes],
    };
  }

  /** Every minute while inside (and once after an eviction). */
  override async alarm(): Promise<void> {
    await this.serial(() => this.beat());
  }

  private serial<T>(work: () => Promise<T>): Promise<T> {
    const run = this.chain.then(work);
    this.chain = run.then(ignore, ignore);
    return run;
  }

  private async enter(input: unknown): Promise<BodyAnswer> {
    const parsed = enterShape.safeParse(input);
    if (!parsed.success) return refuse('input');
    const { props, mundo } = parsed.data;
    const given = parsed.data.grant ?? null;
    if (given !== null && given.userId !== grantUserId(props.accountId, props.agentId)) {
      return refuse('input');
    }
    const store = storeOrigin(this.env);
    const seats = this.env.PLAZAS;
    if (store === null || seats === undefined) return refuse('unconfigured');
    const current = this.inside;
    if (current !== null && !owns(current, props)) return refuse('other-ai');
    if (current !== null) this.touch(current, props.token, given);
    // Into another world, the body keeps the grant it came with when none is given.
    const grant = given ?? current?.grant ?? null;

    const now = Date.now();
    const answer = await this.who(store, props, now);
    if (answer.kind === 'revoked') {
      await this.revoke(grant);
      if (current !== null) await this.end(current, 'revoked');
      return refuse('revoked');
    }
    if (answer.kind !== 'ok') return refuse(ME_REFUSAL[answer.kind]);
    const standing = standingOf(answer.me);
    if (standing !== 'activa' && standing !== 'dormida') {
      if (current !== null) await this.end(current, standing);
      return refuse(standing);
    }
    const world = answer.me.worlds.find((w) => w.id === mundo);
    if (world === undefined) return refuse('no-world');
    if (!isWorldAddress(world.ws)) return refuse('odd');
    if (current !== null) {
      if (current.world === mundo) return inAnswer(current, `You are already in «${mundo}».`);
      await this.end(current, 'other-world');
    }

    const desk = seats.getByName(props.accountId);
    const seat = await desk.take(props.agentId);
    if (!seat.ok) return refuse('full');
    const body = new Body({
      me: props,
      world: mundo,
      ws: world.ws,
      store,
      desk,
      grant,
      now,
      hooks: { pass: (b, aud) => this.pass(b, aud), note: (b, line) => this.note(b, line) },
    });

    this.inside = body;
    const first = new Promise<RespuestaPase | null>((resolve) => {
      body.firstPass = resolve;
    });
    const waiting = setTimeout(() => settleFirst(body, null), FIRST_PASS_MS);
    body.bridge.arrancar();
    const pass = await first;
    clearTimeout(waiting);
    if (pass === null) {
      await this.end(body, 'down');
      return refuse('down');
    }
    if (!pass.ok) {
      await this.end(body, PASS_REFUSAL[pass.motivo]);
      return refuse(PASS_REFUSAL[pass.motivo]);
    }
    await this.ctx.storage.put(BODY_KEY, body.saved());
    await this.ctx.storage.setAlarm(now + BEAT_MS);
    return {
      ok: true,
      world: mundo,
      state: estadoDelPase(pass.pase),
      text: `You are entering «${mundo}». Others there see you arrive, marked as an AI.`,
    };
  }

  /** The bridge's pass fetcher: the token way, with the body's newest token. */
  private async pass(body: Body, aud: string): Promise<RespuestaPase> {
    const answer = await pedirPaseToken({
      numiniaUrl: body.store,
      org: body.org,
      agente: body.agent,
      token: body.token,
      // numinia.com's service binding when bound (story W10), else the global fetch.
      fetcher: storeFetch(this.env),
    })(aud);
    settleFirst(body, answer);
    if (!answer.ok && (answer.motivo === 'token' || answer.motivo === 'apagada')) {
      if (answer.motivo === 'token') void this.revoke(body.grant);
      void this.serial(() => this.end(body, PASS_REFUSAL[answer.motivo]));
    }
    return answer;
  }

  /** A world tool through the bridge's own MCP server, over the tools a URL-connected AI may use. */
  private async run(body: Body, name: string, args: unknown): Promise<ToolOutcome> {
    const server = new ServidorMcp({
      nombre: 'numinia',
      version: '1',
      herramientas: () => worldTools(body.bridge),
      log: (line) => this.note(body, line),
    });
    const reply = toolReply.safeParse(
      await server.atender({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args },
      }),
    );
    if (!reply.success) return { text: `This body has no tool «${name}».`, isError: true };
    const text = reply.data.result.content.map((part) => part.text).join('\n');
    return {
      text: text.split(body.token).join('«token»'),
      isError: reply.data.result.isError === true,
    };
  }

  private note(body: Body, line: string): void {
    this.notes.push(line.split(body.token).join('«token»'));
    if (this.notes.length > NOTES_MAX) this.notes.shift();
  }

  private touch(body: Body, token: string, grant: BodyGrant | null): void {
    body.token = token;
    body.lastCall = Date.now();
    if (grant !== null) body.grant = grant;
  }

  /** `/me`, at most once a minute for the same token. */
  private async who(store: string, ask: MeAsk, now: number): Promise<MeAnswer> {
    const kept = this.me;
    if (kept !== null && kept.token === ask.token && now - kept.at < ME_EVERY_MS) {
      return kept.answer;
    }
    const answer = await askMe(store, ask, storeFetch(this.env));
    this.me = { at: now, token: ask.token, answer };
    return answer;
  }

  /** Revoke the OAuth grant the body came with; best effort (the token is dead anyway). */
  private async revoke(grant: BodyGrant | null): Promise<void> {
    if (grant === null) return;
    try {
      await getOAuthApi(PROVIDER_OPTIONS, this.env).revokeGrant(grant.grantId, grant.userId);
    } catch {
      // KV failed: the grant stays until its tokens expire, and numinia.com still says no.
    }
  }

  /** Out of the world: every timer stops, the seat is freed and the stretch counted. */
  private async end(body: Body, reason: LeaveReason): Promise<number> {
    if (this.inside !== body) return 0;
    this.inside = null;
    body.bridge.parar();
    body.bridge.oidas.length = 0;
    const now = Date.now();
    this.left = { reason, at: now };
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.delete(BODY_KEY);
    try {
      await body.desk.release(body.agent, body.counted, now);
    } catch {
      // The organization's desk did not answer: the seat lapses by itself in three minutes.
    }
    return Math.round((now - body.since) / 1000);
  }

  private async beat(): Promise<void> {
    const body = this.inside;
    if (body === null) {
      await this.orphan();
      return;
    }
    const now = Date.now();
    if (body.bridge.final !== null) {
      await this.end(body, 'world-closed');
      return;
    }
    if (now - body.lastCall >= IDLE_MS) {
      await this.end(body, 'idle');
      return;
    }
    let kept = true;
    try {
      kept = await body.desk.beat(body.agent, body.counted, now);
      body.counted = now;
    } catch {
      // The desk did not answer: this minute is counted with the next one.
    }
    if (!kept) {
      await this.end(body, 'seat-lost');
      return;
    }
    const why = await this.recheck(body, now);
    if (why !== null) {
      await this.end(body, why);
      return;
    }
    // No hearing for URL-connected AIs: what the bridge heard is not kept.
    body.bridge.oidas.length = 0;
    await this.ctx.storage.put(BODY_KEY, body.saved());
    await this.ctx.storage.setAlarm(now + BEAT_MS);
  }

  /** `/me` again (at most once a minute): a reason to leave, or null to stay. */
  private async recheck(body: Body, now: number): Promise<LeaveReason | null> {
    const answer = await this.who(
      body.store,
      { accountId: body.org, agentId: body.agent, token: body.token },
      now,
    );
    if (answer.kind === 'revoked') {
      await this.revoke(body.grant);
      return 'revoked';
    }
    if (answer.kind !== 'ok') return null;
    const standing = standingOf(answer.me);
    if (standing !== 'activa' && standing !== 'dormida') return standing;
    return answer.me.worlds.some((w) => w.id === body.world) ? null : 'world-gone';
  }

  /** An alarm with no body in memory: the object was evicted with a body inside. Free its seat. */
  private async orphan(): Promise<void> {
    const saved = await this.ctx.storage.get<Saved>(BODY_KEY);
    if (saved === undefined) return;
    await this.ctx.storage.delete(BODY_KEY);
    this.left = { reason: 'evicted', at: Date.now() };
    try {
      // What it was inside since the last count is unknown: nothing more is counted.
      await this.env.PLAZAS?.getByName(saved.org).release(
        saved.agent,
        saved.counted,
        saved.counted,
      );
    } catch {
      // The seat lapses by itself in three minutes.
    }
  }
}

/** A world's address the bridge can open: ws:// or wss:// with a host. */
export function isWorldAddress(ws: string): boolean {
  try {
    const url = new URL(ws);
    return (url.protocol === 'ws:' || url.protocol === 'wss:') && url.host !== '';
  } catch {
    return false;
  }
}

function owns(body: Body, props: MeAsk): boolean {
  return body.org === props.accountId && body.agent === props.agentId;
}

function settleFirst(body: Body, answer: RespuestaPase | null): void {
  const resolve = body.firstPass;
  body.firstPass = null;
  resolve?.(answer);
}

function inAnswer(body: Body, text: string): Inside {
  return { ok: true, world: body.world, state: body.bridge.estado, text };
}
