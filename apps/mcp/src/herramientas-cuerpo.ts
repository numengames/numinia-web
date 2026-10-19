/**
 * The body's tools on the MCP endpoint (story W9): `entrar` takes the AI's
 * body into one of its organization's worlds (an id from `mundos`), `salir`
 * takes it out, and the bridge's world tools — mirar, decir, ir_a, colocar,
 * mover, borrar, deshacer — act through it. `oir` is not among them while
 * the house's switch keeps hearing off for AIs connected by URL
 * ({@link URL_AIS_HEAR}: it waits for the lawyers).
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
 */
import { z } from 'zod';
import {
  INSTRUCCIONES,
  PuenteMundo,
  type HerramientaMcp,
  type PedirPase,
} from '../vendor/puente-mundo.mjs';
import { HOUSE_LIBRARY } from './biblioteca';
import { HEAR_TOOL, URL_AIS_HEAR, bodyOf, worldTools, type BodyGrant } from './cuerpo';
import { ENTER_TOOL, ERRORS, type ToolCall, type ToolResult } from './herramientas';

/** The tool that takes the body out of its world. */
export const LEAVE_TOOL = 'salir';

/** The most JSON a world tool's arguments may weigh before they reach a body. */
export const ARGUMENTS_MAX_BYTES = 4096;

export const BODY_ERRORS = {
  enter:
    '«entrar» takes one argument, the world’s id: {"mundo": "<id>"} (the ids come from «mundos»).',
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
    'Take your body into one of your organization’s worlds (its id comes from «mundos»). Others there see you arrive, marked as an AI. Into another world, you leave the one you are in. The world tools work once you are inside.',
  inputSchema: {
    type: 'object',
    properties: {
      mundo: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'The world’s id, as «mundos» lists it.',
      },
    },
    required: ['mundo'],
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
function bridgeTools(hear: boolean): HerramientaMcp[] {
  const catalog = new PuenteMundo({
    url: 'wss://catalog.invalid/ws',
    id: 'catalog',
    biblioteca: HOUSE_LIBRARY,
    pedirPase: NO_PASS,
  });
  return worldTools(catalog, hear);
}

/** `entrar`, `salir` and the world tools, without `oir` unless hearing is on. */
export function bodyTools(hear: boolean = URL_AIS_HEAR): ListedTool[] {
  const world = bridgeTools(hear).map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  }));
  return [ENTER, LEAVE, ...world];
}

/** Whether the relay has a body tool by this name. */
export const isBodyTool = (name: string, hear: boolean = URL_AIS_HEAR): boolean =>
  bodyTools(hear).some((listed) => listed.name === name);

/**
 * What `initialize` tells the AI: how to get a body, then the bridge's own
 * instructions (without `oir` while hearing is off).
 */
export function serverInstructions(hear: boolean = URL_AIS_HEAR): string {
  const bridge = hear ? INSTRUCCIONES : INSTRUCCIONES.replace(`, ${HEAR_TOOL}.`, '.');
  return [
    'Numinia. «quien_soy» says who you are and whether you may enter worlds; «mundos» lists your organization’s worlds.',
    '«entrar» {"mundo": "<id>"} takes your body into one, and «salir» takes it out; the world tools act only while you are inside.',
    bridge,
  ].join(' ');
}

const propsShape = z.object({
  accountId: z.string().min(1),
  agentId: z.string().min(1),
  token: z.string().min(1),
});
const enterShape = z.object({ mundo: z.string().min(1).max(200) }).strict();

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
  if (name === ENTER_TOOL) return enterShape.safeParse(args).success ? null : BODY_ERRORS.enter;
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
    if (name === ENTER_TOOL) {
      const { mundo } = enterShape.parse(args);
      const entered = await body.entrar({ props: ask, mundo, grant });
      if (!entered.ok) return failure(entered.text);
      return success({ world: entered.world, state: entered.state, note: entered.text });
    }

    const used = await body.usar({ props: ask, grant, tool: { name, arguments: args ?? {} } });
    if (!used.ok || used.result === undefined) return failure(used.text);
    if (used.result.isError) return failure(used.result.text);
    return { content: [{ type: 'text', text: used.result.text }] };
  } catch {
    return failure(BODY_ERRORS.unreachable);
  }
}
