/**
 * The MCP endpoint behind the token check: JSON-RPC over Streamable HTTP,
 * written by hand (no SDK). It lists and calls the relay's own tools,
 * `quien_soy` and `mundos` (herramientas.ts, story W7), then the body's:
 * `entrar`, `salir` and the bridge's world tools, each run by the AI's own
 * Durable Object `Cuerpo` (herramientas-cuerpo.ts, story W9). One POST is one message and the relay keeps no
 * session, as the 2026-07-28 transport asks; the `initialize` of earlier
 * revisions is answered so clients of either era connect.
 *
 * A tool that fails answers a result with `isError: true` (the AI reads why
 * and can act); only a call the protocol cannot carry out — no tool by that
 * name, no `name` — is a JSON-RPC error (`-32602`).
 */
import { isStaticBearer } from './bearer';
import type { Env } from './env';
import { TOOLS, callTool, isTool, type ToolCall } from './herramientas';
import { bodyTools, callBodyTool, isBodyTool, serverInstructions } from './herramientas-cuerpo';

/** Revisions whose `initialize` the relay answers, newest first. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;

/** How the relay names itself to a client. */
export const SERVER_INFO = { name: 'numinia', title: 'Numinia', version: '0.1.0' } as const;

/** JSON-RPC 2.0 error codes the endpoint uses. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

type RpcError = { readonly code: number; readonly message: string };
type RpcAnswer = { result: unknown } | { error: RpcError };

type JsonRpcId = string | number | null;

function reply(id: JsonRpcId, body: RpcAnswer): Response {
  return Response.json(
    { jsonrpc: '2.0', id, ...body },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function protocolFor(params: unknown): string {
  const asked = isRecord(params) ? params.protocolVersion : undefined;
  const known: readonly string[] = PROTOCOL_VERSIONS;
  return typeof asked === 'string' && known.includes(asked) ? asked : PROTOCOL_VERSIONS[0];
}

async function toolsCall(params: unknown, call: ToolCall): Promise<RpcAnswer> {
  if (!isRecord(params) || typeof params.name !== 'string') {
    return { error: { code: INVALID_PARAMS, message: 'Invalid params: a tool name is required' } };
  }
  const { name } = params;
  if (isTool(name)) return { result: await callTool(name, params.arguments, call) };
  if (isBodyTool(name)) return { result: await callBodyTool(name, params.arguments, call) };
  return { error: { code: INVALID_PARAMS, message: `Unknown tool: ${name}` } };
}

async function answerOf(method: string, params: unknown, call: ToolCall): Promise<RpcAnswer> {
  if (method === 'tools/call') return toolsCall(params, call);
  const result = resultOf(method, params);
  if (result === undefined) {
    return { error: { code: METHOD_NOT_FOUND, message: `Method not found: ${method}` } };
  }
  return { result };
}

function resultOf(method: string, params: unknown): unknown {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: protocolFor(params),
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: serverInstructions(),
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: [...TOOLS, ...bodyTools()] };
    default:
      return undefined;
  }
}

/** The context the OAuth library hands its `apiHandler`: the grant's props and the token it checked. */
export interface McpContext {
  readonly props?: unknown;
  readonly auth?: { readonly token?: unknown };
}

/** One MCP message, already past the OAuth check (the library's `apiHandler`). */
export async function handleMcp(request: Request, env: Env, ctx: McpContext): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return reply(null, { error: { code: PARSE_ERROR, message: 'Parse error' } });
  }
  if (!isRecord(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return reply(null, { error: { code: INVALID_REQUEST, message: 'Invalid Request' } });
  }
  // A notification carries no id and gets no answer.
  if (!('id' in message)) return new Response(null, { status: 202 });
  const id = message.id;
  if (typeof id !== 'string' && typeof id !== 'number') {
    return reply(null, { error: { code: INVALID_REQUEST, message: 'Invalid Request' } });
  }
  const token = ctx.auth?.token;
  const call: ToolCall = {
    env,
    props: ctx.props,
    // A pasted panel token (story W11) has no grant to find: it goes no further than the props.
    accessToken: typeof token === 'string' && !isStaticBearer(ctx.props) ? token : null,
  };
  return reply(id, await answerOf(message.method, message.params, call));
}
