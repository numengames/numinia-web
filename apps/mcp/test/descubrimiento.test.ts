/**
 * Discovery (story W5): what a client that only knows
 * https://mcp.numinia.com/mcp learns on its way to a token, and the token
 * lifetimes it ends up with. The grant in the lifetime tests is completed
 * with the library's own helpers, as `/vuelta` does (the whole flow through
 * numinia.com is flujo-oauth.test.ts, story W6).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getOAuthApi } from '@cloudflare/workers-oauth-provider';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CLIENT_REGISTRATION_TTL_SECONDS,
  CONNECTION_MAX_SECONDS,
  REFRESH_TOKEN_IDLE_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  RESOURCE,
} from '../src/config';
import worker, { PROVIDER_OPTIONS, type Env } from '../src/worker';
import { MemoryKv } from './memory-kv';

const ORIGIN = 'https://mcp.numinia.com';
const CLAUDE_CALLBACK = 'https://claude.ai/api/mcp/auth_callback';

const ctx = {
  waitUntil: () => undefined,
  passThroughOnException: () => undefined,
  props: {},
} as unknown as ExecutionContext;

let kv: MemoryKv;
let env: Env;

beforeEach(() => {
  kv = new MemoryKv();
  env = { OAUTH_KV: kv.asNamespace() };
});

function call(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(`${ORIGIN}${path}`, init), env, ctx);
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function base64url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString('base64url');
}

/** A JSONC file (wrangler's): comments and trailing commas removed, then JSON. */
function readJsonc(relative: string): Record<string, unknown> {
  const text = readFileSync(fileURLToPath(new URL(relative, import.meta.url).href), 'utf8');
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i);
    if (inString) {
      out += char;
      if (char === '\\') {
        out += text.charAt(i + 1);
        i += 1;
      } else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
      out += char;
    } else if (char === '/' && text.charAt(i + 1) === '/') {
      while (i < text.length && text.charAt(i) !== '\n') i += 1;
      out += '\n';
    } else out += char;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1')) as Record<string, unknown>;
}

describe('/mcp without a token', () => {
  it('answers 401 with a Bearer challenge naming the resource metadata and the scope', async () => {
    const response = await call('/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(response.status).toBe(401);
    const challenge = response.headers.get('WWW-Authenticate') ?? '';
    expect(challenge).toMatch(/^Bearer /);
    expect(challenge).toContain(
      'resource_metadata="https://mcp.numinia.com/.well-known/oauth-protected-resource/mcp"',
    );
    expect(challenge).toContain('scope="mundos"');
  });

  it('answers 401 to a token it never issued', async () => {
    const response = await call('/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer user:grant:not-a-token' },
      body: '{}',
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toContain('resource_metadata=');
  });
});

describe('protected resource metadata (RFC 9728)', () => {
  it('names exactly the pasted URL as the resource and the relay as its one authorization server', async () => {
    const response = await call('/.well-known/oauth-protected-resource/mcp');
    expect(response.status).toBe(200);
    const metadata = await json(response);
    expect(metadata.resource).toBe('https://mcp.numinia.com/mcp');
    expect(metadata.resource).toBe(RESOURCE);
    expect(metadata.authorization_servers).toEqual(['https://mcp.numinia.com']);
    expect(metadata.bearer_methods_supported).toEqual(['header']);
    // offline_access is an authorization-server capability, not a resource requirement.
    expect(metadata.scopes_supported).toEqual(['mundos']);
  });
});

describe('authorization server metadata (RFC 8414)', () => {
  it('advertises S256 only, public clients, CIMD with DCR as fallback, and offline_access', async () => {
    const response = await call('/.well-known/oauth-authorization-server');
    expect(response.status).toBe(200);
    const metadata = await json(response);
    expect(metadata.issuer).toBe('https://mcp.numinia.com');
    expect(metadata.authorization_endpoint).toBe('https://mcp.numinia.com/authorize');
    expect(metadata.token_endpoint).toBe('https://mcp.numinia.com/token');
    expect(metadata.registration_endpoint).toBe('https://mcp.numinia.com/register');
    expect(metadata.revocation_endpoint).toBe('https://mcp.numinia.com/token');
    expect(metadata.code_challenge_methods_supported).toEqual(['S256']);
    expect(metadata.token_endpoint_auth_methods_supported).toContain('none');
    expect(metadata.client_id_metadata_document_supported).toBe(true);
    expect(metadata.scopes_supported).toEqual(['mundos', 'offline_access']);
    expect(metadata.grant_types_supported).toEqual(['authorization_code', 'refresh_token']);
    expect(metadata.response_types_supported).toEqual(['code']);
    expect(metadata.protected_resources).toEqual(['https://mcp.numinia.com/mcp']);
    expect(metadata.authorization_response_iss_parameter_supported).toBe(true);
  });
});

describe('the rest', () => {
  it('answers anything else with 404', async () => {
    const response = await call('/');
    expect(response.status).toBe(404);
  });
});

describe('dynamic client registration (the fallback)', () => {
  it('registers a public client without a secret, kept 90 days', async () => {
    const response = await call('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Hermes',
        redirect_uris: ['http://127.0.0.1:8765/callback'],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });
    expect(response.status).toBe(201);
    const client = await json(response);
    expect(client.token_endpoint_auth_method).toBe('none');
    expect(client.client_secret).toBeUndefined();
    expect(kv.lastWrite('client:')?.options?.expirationTtl).toBe(CLIENT_REGISTRATION_TTL_SECONDS);
    expect(CLIENT_REGISTRATION_TTL_SECONDS).toBe(7_776_000);
  });
});

describe('PKCE and token lifetimes', () => {
  async function pkce(): Promise<{ verifier: string; challenge: string }> {
    const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return { verifier, challenge: base64url(digest) };
  }

  function authorizeUrl(clientId: string, challenge: string, method = 'S256'): string {
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: CLAUDE_CALLBACK,
      scope: 'mundos offline_access',
      state: 'state-1',
      code_challenge: challenge,
      code_challenge_method: method,
      resource: RESOURCE,
    });
    return `${ORIGIN}/authorize?${query.toString()}`;
  }

  function tokenRequest(fields: Record<string, string>): Promise<Response> {
    return call('/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
  }

  it('refuses the plain PKCE method', async () => {
    const helpers = getOAuthApi(PROVIDER_OPTIONS, env);
    const client = await helpers.createClient({
      redirectUris: [CLAUDE_CALLBACK],
      clientName: 'Claude',
      tokenEndpointAuthMethod: 'none',
    });
    await expect(
      helpers.parseAuthRequest(new Request(authorizeUrl(client.clientId, 'x'.repeat(43), 'plain'))),
    ).rejects.toThrow(/S256/);
  });

  it('sets the lifetimes by hand: 1 h access, 30 days from last use, 90 days at most', () => {
    expect(PROVIDER_OPTIONS.accessTokenTTL).toBe(3_600);
    expect(PROVIDER_OPTIONS.refreshTokenTTL).toBe(2_592_000);
    expect(PROVIDER_OPTIONS.refreshTokenIdleTTL).toBe(2_592_000);
    expect(REFRESH_TOKEN_IDLE_TTL_SECONDS).toBe(REFRESH_TOKEN_TTL_SECONDS);
    expect(CONNECTION_MAX_SECONDS).toBe(7_776_000);
  });

  it('issues a one-hour access token and a 30-day refresh token that rotates on use', async () => {
    const helpers = getOAuthApi(PROVIDER_OPTIONS, env);
    const client = await helpers.createClient({
      redirectUris: [CLAUDE_CALLBACK],
      clientName: 'Claude',
      tokenEndpointAuthMethod: 'none',
    });
    const { verifier, challenge } = await pkce();
    const request = await helpers.parseAuthRequest(
      new Request(authorizeUrl(client.clientId, challenge)),
    );
    expect(request.resource).toBe(RESOURCE);
    expect(request.codeChallengeMethod).toBe('S256');
    const { redirectTo } = await helpers.completeAuthorization({
      request,
      userId: 'agent-1',
      metadata: {},
      scope: request.scope,
      // As /vuelta writes them: the 90-day ceiling counts from connectedAt.
      props: { connectedAt: Math.floor(Date.now() / 1000) },
    });
    const code = new URL(redirectTo).searchParams.get('code') ?? '';

    const issued = await tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CLAUDE_CALLBACK,
      client_id: client.clientId,
      code_verifier: verifier,
      resource: RESOURCE,
    });
    expect(issued.status).toBe(200);
    const first = await json(issued);
    expect(first.expires_in).toBe(3600);
    expect(first.expires_in).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(first.resource).toBe(RESOURCE);
    expect(typeof first.refresh_token).toBe('string');
    expect(kv.lastWrite('token:')?.options?.expirationTtl).toBe(ACCESS_TOKEN_TTL_SECONDS);
    const grantWrite = kv.lastWrite('grant:');
    const grantTtl =
      grantWrite?.options?.expirationTtl ??
      (grantWrite?.options?.expiration ?? 0) - Math.floor(Date.now() / 1000);
    expect(grantTtl).toBeGreaterThanOrEqual(REFRESH_TOKEN_TTL_SECONDS - 5);
    expect(grantTtl).toBeLessThanOrEqual(REFRESH_TOKEN_TTL_SECONDS);
    expect(REFRESH_TOKEN_TTL_SECONDS).toBe(2_592_000);

    // The access token opens /mcp, which lists no tools yet (W7 adds them).
    const listed = await call('/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${String(first.access_token)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list' }),
    });
    expect(listed.status).toBe(200);
    expect(await json(listed)).toEqual({ jsonrpc: '2.0', id: 7, result: { tools: [] } });

    // Refreshing rotates the refresh token and restarts its 30 days.
    const refreshed = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(first.refresh_token),
      client_id: client.clientId,
    });
    expect(refreshed.status).toBe(200);
    const second = await json(refreshed);
    expect(second.expires_in).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(typeof second.refresh_token).toBe('string');
    expect(second.refresh_token).not.toBe(first.refresh_token);
    const slid = (kv.lastWrite('grant:')?.options?.expiration ?? 0) - Math.floor(Date.now() / 1000);
    expect(slid).toBeGreaterThanOrEqual(REFRESH_TOKEN_IDLE_TTL_SECONDS - 5);
    expect(slid).toBeLessThanOrEqual(REFRESH_TOKEN_IDLE_TTL_SECONDS);

    // Once the new one is used, the first one is dead: invalid_grant.
    const third = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(second.refresh_token),
      client_id: client.clientId,
    });
    expect(third.status).toBe(200);
    const replay = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: String(first.refresh_token),
      client_id: client.clientId,
    });
    expect(replay.status).toBe(400);
    expect((await json(replay)).error).toBe('invalid_grant');
  });
});

describe('wrangler.jsonc', () => {
  const config = readJsonc('../wrangler.jsonc');

  it('sets the flag CIMD needs, so what the tests assume is what the runtime gives', () => {
    expect(config.compatibility_flags).toContain('global_fetch_strictly_public');
  });

  it('names numinia.com as the store, a bare https origin', () => {
    expect(config.vars).toEqual({ STORE_ORIGIN: 'https://numinia.com' });
  });

  it('binds the OAuth store as OAUTH_KV', () => {
    const namespaces = config.kv_namespaces as { binding: string }[];
    expect(namespaces.map((namespace) => namespace.binding)).toEqual(['OAUTH_KV']);
  });

  it('answers only on its own domain, the origin of the resource', () => {
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
    expect(config.routes).toEqual([{ pattern: 'mcp.numinia.com', custom_domain: true }]);
    expect(new URL(RESOURCE).host).toBe('mcp.numinia.com');
  });
});
