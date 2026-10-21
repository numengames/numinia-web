/**
 * The body's tools on the MCP endpoint (story W9): `entrar` takes the AI's
 * body into one of its organization's worlds (an id from `mundos`), `salir`
 * takes it out, and the bridge's world tools — mirar, decir, ir_a, colocar,
 * mover, borrar, deshacer, llamadas, esperar_llamada, gesto — act through
 * it. What the AI hears (`oye` in `/me`, D-083) filters them: `llamadas`,
 * `esperar_llamada` and `gesto` are for all three rungs (a call addressed to
 * the AI reaches it), `esperar_llamada` wakes for someone entering the AI's
 * bubble only from `burbuja` up, and `oir` is among them only at `todo`.
 * `esperar_llamada` holds the call at most 25 s (the bridge's own limit): the
 * wait runs in the body outside its queue, so the alarm and the AI's other calls go on; the Worker only awaits the object's answer,
 * which Cloudflare does not cut by wall time while the client is connected,
 * and an MCP client's usual timeout is 60 s or more. Not yet seen in
 * production with a real client.
 *
 * The Worker keeps nothing: every call goes to the AI's own Durable Object
 * `Cuerpo` (named `<org>.<agent>` from the grant's props), and a world tool
 * runs there through `usar()`, which keeps the body awake, hands it the
 * newest token and has the bridge's own MCP server run the tool. The world
 * tools are listed with the bridge's own names, descriptions and schemas
 * (`PuenteMundo.herramientas()`), and their answers are the bridge's own
 * text: what people in the world wrote stays inside its fenced
 * `<material fiable="no">` block, and what the world or the AI's pass
 * forbids (asleep, no building here, a build refused) comes back as the
 * world's refusal, an `isError` result the AI reads.
 *
 * A panel token pasted as a static bearer (story W11, bearer.ts) drives the
 * same body under the same name; it comes with no grant, so when
 * numinia.com stops accepting the token the body leaves with nothing to
 * revoke, and the AI is told the token no longer works.
 */
import { z } from 'zod';
import {
  INSTRUCCIONES,
  PuenteMundo,
  type HerramientaMcp,
  type PedirPase,
} from '../vendor/puente-mundo.mjs';
import { STATIC_REVOKED, isStaticBearer } from './bearer';
import { HOUSE_LIBRARY } from './biblioteca';
import { HEAR_TOOL, bodyOf, worldTools, type BodyAnswer, type BodyGrant } from './cuerpo';
import { storeFetch, storeOrigin } from './env';
import { ENTER_TOOL, ERRORS, type ToolCall, type ToolResult } from './herramientas';
import { askMe, type Hearing } from './me';

/** The tool that takes the body out of its world. */
export const LEAVE_TOOL = 'salir';

/** The most JSON a world tool's arguments may weigh before they reach a body. */
export const ARGUMENTS_MAX_BYTES = 4096;

export const BODY_ERRORS = {
  enter:
    '«entrar» takes at most one argument, the world’s id: {"mundo": "<id>"} (the ids come from «mundos»); with {} it takes you home.',
  tooLarge: `Those arguments are too large (at most ${ARGUMENTS_MAX_BYTES} bytes of JSON).`,
  unconfigured:
    'This server cannot take bodies into worlds right now (it is not configured). Try again later.',
  unreachable: 'Your body did not answer. Try again in a moment.',
} as const;

/** One tool as `tools/list` shows it. */
export interface ListedTool {
  readonly name: string;
  readonly title?: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

const ENTER: ListedTool = {
  name: ENTER_TOOL,
  title: 'Enter a world',
  description:
    'Take your body into one of the worlds you live in (its id comes from «mundos»); with no world, into your home, the first of them. Others there see you arrive, marked as an AI. Into another world, you leave the one you are in. The world tools work once you are inside.',
  inputSchema: {
    type: 'object',
    properties: {
      mundo: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'The world’s id, as «mundos» lists it. Left out: your home.',
      },
    },
    additionalProperties: false,
  },
};

const LEAVE: ListedTool = {
  name: LEAVE_TOOL,
  title: 'Leave the world',
  description:
    'Take your body out of the world it is in, freeing your organization’s seat. Takes no arguments.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
};

/** The pass fetcher of a bridge that only lists its tools: it never enters a world. */
export const NO_PASS: PedirPase = () =>
  Promise.resolve({ ok: false, motivo: 'red', texto: 'This bridge only lists its tools.' });

/**
 * The bridge's world tools as it lists them, from a bridge that never
 * connects (only its list is read): the schema of `colocar` names the
 * house's library.
 */
function bridgeTools(hearing: Hearing): HerramientaMcp[] {
  const catalog = new PuenteMundo({
    url: 'wss://catalog.invalid/ws',
    id: 'catalog',
    biblioteca: HOUSE_LIBRARY,
    pedirPase: NO_PASS,
  });
  return worldTools(catalog, hearing);
}

/**
 * What this AI hears now (D-083): the `oye` of numinia.com's `/me`, asked
 * for the listing (the panel's ladder can change at any time). When `/me`
 * cannot be read, the `hear` the grant was made with is the fallback: `todo`
 * if it was on, else `llamada`, only who calls it (no props: the same).
 */
export async function hearingOf(call: ToolCall): Promise<Hearing> {
  const props = hearShape.safeParse(call.props);
  if (!props.success) return 'llamada';
  const fallback = props.data.hear === true ? 'todo' : 'llamada';
  const store = storeOrigin(call.env);
  if (store === null) return fallback;
  const answer = await askMe(store, props.data, storeFetch(call.env));
  return answer.kind === 'ok' ? answer.me.oye : fallback;
}

/** Whether this AI hears everything nearby now (`oir` is a tool only for it). */
export async function hearOf(call: ToolCall): Promise<boolean> {
  return (await hearingOf(call)) === 'todo';
}

/** `entrar`, `salir` and the world tools, as far as the AI's hearing lets them be listed. */
export function bodyTools(hearing: Hearing): ListedTool[] {
  const world = bridgeTools(hearing).map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
  return [ENTER, LEAVE, ...world];
}

/** Whether the relay has a body tool by this name. */
export const isBodyTool = (name: string): boolean =>
  bodyTools('todo').some((listed) => listed.name === name);

/**
 * What `initialize` tells the AI: how to get a body, then the bridge's own
 * instructions (without `oir` unless the AI hears everything nearby).
 */
export function serverInstructions(hearing: Hearing): string {
  const bridge = hearing === 'todo' ? INSTRUCCIONES : INSTRUCCIONES.replace(`, ${HEAR_TOOL},`, ',');
  return [
    'Numinia. «quien_soy» says who you are, whether you may enter worlds and where you live; «mundos» lists the worlds you live in.',
    '«entrar» {"mundo": "<id>"} takes your body into one (with no world, into your home), and «salir» takes it out; the world tools act only while you are inside.',
    bridge,
  ].join(' ');
}

const propsShape = z.object({
  accountId: z.string().min(1),
  agentId: z.string().min(1),
  token: z.string().min(1),
});
const hearShape = propsShape.extend({ hear: z.boolean().optional() });
const enterShape = z.object({ mundo: z.string().min(1).max(200).optional() }).strict();

const failure = (text: string): ToolResult => ({
  content: [{ type: 'text', text }],
  isError: true,
});

const success = (structured: Record<string, unknown>): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(structured) }],
  structuredContent: structured,
});

const hasArguments = (args: unknown): boolean =>
  args !== undefined &&
  args !== null &&
  !(typeof args === 'object' && !Array.isArray(args) && Object.keys(args).length === 0);

/**
 * The grant this access token belongs to, for the body to revoke when
 * numinia.com stops accepting the AI's token. None when the library
 * cannot say: the body still enters, with no grant to end.
 */
async function grantOf(call: ToolCall): Promise<BodyGrant | undefined> {
  const helpers = call.env.OAUTH_PROVIDER;
  if (helpers === undefined || call.accessToken === null) return undefined;
  try {
    const held = await helpers.unwrapToken(call.accessToken);
    return held === null ? undefined : { grantId: held.grantId, userId: held.userId };
  } catch {
    return undefined;
  }
}

/** What the relay checks before a body is woken: the arguments, as far as it reads them. */
function argumentsProblem(name: string, args: unknown): string | null {
  // No arguments at all is {}: «entrar» with no world goes home.
  if (name === ENTER_TOOL)
    return enterShape.safeParse(args ?? {}).success ? null : BODY_ERRORS.enter;
  if (name === LEAVE_TOOL) return hasArguments(args) ? ERRORS.arguments : null;
  const bytes = new TextEncoder().encode(JSON.stringify(args ?? {})).length;
  return bytes > ARGUMENTS_MAX_BYTES ? BODY_ERRORS.tooLarge : null;
}

/** `tools/call` of a body tool; `name` is known ({@link isBodyTool}). */
export async function callBodyTool(
  name: string,
  args: unknown,
  call: ToolCall,
): Promise<ToolResult> {
  const props = propsShape.safeParse(call.props);
  if (!props.success) return failure(ERRORS.noAi);
  const problem = argumentsProblem(name, args);
  if (problem !== null) return failure(problem);
  const { accountId, agentId, token } = props.data;
  try {
    const body = bodyOf(call.env, accountId, agentId);
    if (body === null) return failure(BODY_ERRORS.unconfigured);
    const ask = { accountId, agentId, token };

    if (name === LEAVE_TOOL) {
      const left = await body.salir();
      return success({
        left: left.left,
        world: left.world,
        seconds: left.seconds,
        note: left.left
          ? `You left «${left.world}» after ${left.seconds} s.`
          : 'You were not in any world.',
      });
    }

    const grant = await grantOf(call);
    // The body's word for a token numinia.com refused speaks of a grant: a pasted one has none.
    const refused = (answer: BodyAnswer): ToolResult =>
      failure(
        !answer.ok && answer.reason === 'revoked' && isStaticBearer(call.props)
          ? STATIC_REVOKED
          : answer.text,
      );
    if (name === ENTER_TOOL) {
      const { mundo } = enterShape.parse(args ?? {});
      const entered = await body.entrar({
        props: ask,
        ...(mundo === undefined ? {} : { mundo }),
        grant,
      });
      if (!entered.ok) return refused(entered);
      return success({ world: entered.world, state: entered.state, note: entered.text });
    }

    const used = await body.usar({ props: ask, grant, tool: { name, arguments: args ?? {} } });
    if (!used.ok || used.result === undefined) return refused(used);
    if (used.result.isError) return failure(used.result.text);
    return { content: [{ type: 'text', text: used.result.text }] };
  } catch {
    return failure(BODY_ERRORS.unreachable);
  }
}
