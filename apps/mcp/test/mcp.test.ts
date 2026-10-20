/**
 * The MCP endpoint behind the token check: JSON-RPC over one POST. The
 * tools themselves are herramientas-mundos.test.ts (story W7).
 */
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../src/herramientas';
import { bodyTools, serverInstructions } from '../src/herramientas-cuerpo';
import { PROTOCOL_VERSIONS, SERVER_INFO, handleMcp } from '../src/mcp';
import { MemoryKv } from './memory-kv';

const env = { OAUTH_KV: new MemoryKv().asNamespace() };

function post(body: string): Promise<Response> {
  return handleMcp(
    new Request('https://mcp.numinia.com/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }),
    env,
    {},
  );
}

function rpc(message: Record<string, unknown>): Promise<Response> {
  return post(JSON.stringify({ jsonrpc: '2.0', ...message }));
}

describe('handleMcp', () => {
  it('answers only POST', async () => {
    const response = await handleMcp(new Request('https://mcp.numinia.com/mcp'), env, {});
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('POST');
  });

  it('answers a body that is not JSON with a parse error', async () => {
    const body = await (await post('{')).json();
    expect(body).toEqual({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    });
  });

  it.each([
    ['a batch', '[{"jsonrpc":"2.0","id":1,"method":"ping"}]'],
    ['no jsonrpc', '{"id":1,"method":"ping"}'],
    ['no method', '{"jsonrpc":"2.0","id":1}'],
    ['a null id', '{"jsonrpc":"2.0","id":null,"method":"ping"}'],
  ])('answers %s with Invalid Request', async (_name, text) => {
    const body = (await (await post(text)).json()) as { error: { code: number } };
    expect(body.error.code).toBe(-32600);
  });

  it('accepts a notification with 202 and no body', async () => {
    const response = await rpc({ method: 'notifications/initialized' });
    expect(response.status).toBe(202);
    expect(await response.text()).toBe('');
  });

  it('answers initialize with the version asked for when it knows it', async () => {
    const body = await (
      await rpc({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })
    ).json();
    expect(body).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: serverInstructions(false),
      },
    });
  });

  it('answers initialize with its newest version otherwise', async () => {
    const asked = (await (
      await rpc({ id: 'a', method: 'initialize', params: { protocolVersion: '1999-01-01' } })
    ).json()) as { result: { protocolVersion: string } };
    expect(asked.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
    const none = (await (await rpc({ id: 'b', method: 'initialize' })).json()) as {
      result: { protocolVersion: string };
    };
    expect(none.result.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it('answers ping and tools/list', async () => {
    expect(await (await rpc({ id: 2, method: 'ping' })).json()).toEqual({
      jsonrpc: '2.0',
      id: 2,
      result: {},
    });
    expect(await (await rpc({ id: 3, method: 'tools/list' })).json()).toEqual({
      jsonrpc: '2.0',
      id: 3,
      result: { tools: [...TOOLS, ...bodyTools(false)] },
    });
  });

  it('answers an unknown method with Method not found', async () => {
    const body = (await (await rpc({ id: 4, method: 'resources/list' })).json()) as {
      id: number;
      error: { code: number; message: string };
    };
    expect(body.id).toBe(4);
    expect(body.error).toEqual({ code: -32601, message: 'Method not found: resources/list' });
  });
});
