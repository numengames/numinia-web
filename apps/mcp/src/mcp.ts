/**
 * The MCP endpoint behind the token check, as a stub: it speaks enough
 * JSON-RPC over Streamable HTTP for a client to connect and list tools, and
 * lists none. Story W7 adds `quien_soy` and `mundos`; W8 and W9 the body in
 * the world. One POST is one message and the relay keeps no session, as the
 * 2026-07-28 transport asks; the `initialize` of earlier revisions is
 * answered so clients of either era connect.
 */

/** Revisions whose `initialize` the relay answers, newest first. */
export const PROTOCOL_VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;

/** How the relay names itself to a client. */
export const SERVER_INFO = { name: 'numinia', title: 'Numinia', version: '0.1.0' } as const;

/** JSON-RPC 2.0 error codes the stub uses. */
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;

type JsonRpcId = string | number | null;

function reply(
  id: JsonRpcId,
  body: { result: unknown } | { error: { code: number; message: string } },
): Response {
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

function resultOf(method: string, params: unknown): unknown {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: protocolFor(params),
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: [] };
    default:
      return undefined;
  }
}

/** One MCP message, already past the OAuth check (the library's `apiHandler`). */
export async function handleMcp(request: Request): Promise<Response> {
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
  const result = resultOf(message.method, message.params);
  if (result === undefined) {
    return reply(id, {
      error: { code: METHOD_NOT_FOUND, message: `Method not found: ${message.method}` },
    });
  }
  return reply(id, { result });
}
