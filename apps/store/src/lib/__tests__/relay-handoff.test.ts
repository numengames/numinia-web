/**
 * «MCP remoto», story W6: numinia.com's side of the hand-off
 * (lib/relay-handoff.ts) — the relay asked through its service binding,
 * every answer re-checked, the token handed to the relay and nowhere else
 * (never a log line, never the answer), and the fixture's stand-in.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  RELAY_ORIGIN,
  boundRelay,
  fixtureRelay,
  relayFrom,
  relayOf,
  vueltaHref,
  type RelayDesk,
} from '../relay-handoff';

const REQ = 'req_0123456789abcdef';
const TOKEN = `ntk_${'Tq9'.repeat(14)}x`;
const ASK = { req: REQ, app: 'Claude', host: 'claude.ai' };
const CONNECTION = {
  req: REQ,
  accountId: 'acc_t_2e2dd18c880ba974da1512dc7cde2431',
  agentId: 'claude-de-ana',
  via: 'mcp:claude.ai',
  hear: false,
};

/** A desk whose answers a test sets; `keep` records what it was handed. */
function deskOf(ask: unknown, keep: unknown = { ok: true, next: vueltaHref(REQ) }) {
  return {
    ask: vi.fn(async (_req: string) => (ask instanceof Error ? Promise.reject(ask) : ask)),
    keep: vi.fn(async (_handOff: unknown) => (keep instanceof Error ? Promise.reject(keep) : keep)),
  } satisfies RelayDesk;
}

describe('asking the relay before anything is made', () => {
  it('is ok only when the relay waits for the request with the app and host the page showed', async () => {
    const desk = deskOf({ ok: true, app: 'Claude', host: 'claude.ai' });
    expect(await relayOf(desk, vi.fn()).check(ASK)).toBe('ok');
    expect(desk.ask).toHaveBeenCalledWith(REQ);
    // The relay's name read as the page reads it: trimmed, host lower case.
    const loose = deskOf({ ok: true, app: '  Claude ', host: 'CLAUDE.AI.' });
    expect(await relayOf(loose, vi.fn()).check(ASK)).toBe('ok');
  });

  it('refuses an edited link: another name, another host, or a name the page cannot read', async () => {
    for (const asked of [
      { ok: true, app: 'ChatGPT', host: 'claude.ai' },
      { ok: true, app: 'Claude', host: 'evil.example' },
      { ok: true, app: ' ', host: 'claude.ai' },
      { ok: false },
    ]) {
      expect(await relayOf(deskOf(asked), vi.fn()).check(ASK)).toBe('request');
    }
  });

  it('is unavailable when the relay throws or answers something else, logging the outcome only', async () => {
    for (const asked of [new Error(`boom ${TOKEN}`), { ok: 'yes' }, null]) {
      const log = vi.fn();
      expect(await relayOf(deskOf(asked), log).check(ASK)).toBe('unavailable');
      expect(log).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain(REQ);
      expect(JSON.stringify(log.mock.calls)).not.toContain('boom');
    }
  });
});

describe('handing the token over', () => {
  it('hands the relay the connection and its token, and answers its /vuelta', async () => {
    const desk = deskOf({ ok: true, app: 'Claude', host: 'claude.ai' });
    const log = vi.fn();
    expect(await relayOf(desk, log).handOff(CONNECTION, TOKEN)).toEqual({
      ok: true,
      next: `${RELAY_ORIGIN}/vuelta?req=${REQ}`,
    });
    expect(desk.keep).toHaveBeenCalledWith({ ...CONNECTION, token: TOKEN });
    expect(log).not.toHaveBeenCalled();
  });

  it('hands over only the named fields, whatever else the connection carries', async () => {
    const desk = deskOf(null);
    await relayOf(desk, vi.fn()).handOff(
      { ...CONNECTION, name: 'Claude de Ana', action: 'create' } as typeof CONNECTION,
      TOKEN,
    );
    expect(Object.keys(desk.keep.mock.calls[0]?.[0] as object).sort()).toEqual(
      ['accountId', 'agentId', 'hear', 'req', 'token', 'via'].sort(),
    );
  });

  it('says «request» when the relay refuses it', async () => {
    const desk = deskOf(null, { ok: false });
    expect(await relayOf(desk, vi.fn()).handOff(CONNECTION, TOKEN)).toEqual({
      ok: false,
      refusal: 'request',
    });
  });

  it('never sends the browser anywhere but the relay’s /vuelta for this request', async () => {
    for (const next of [
      'https://evil.example/vuelta?req=req_0123456789abcdef',
      `${RELAY_ORIGIN}/vuelta?req=another_request_id_00`,
      `${RELAY_ORIGIN}/vuelta?req=${REQ}&token=${TOKEN}`,
    ]) {
      const log = vi.fn();
      expect(
        await relayOf(deskOf(null, { ok: true, next }), log).handOff(CONNECTION, TOKEN),
      ).toEqual({ ok: false, refusal: 'unavailable' });
      expect(log).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'next' }));
      expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
    }
  });

  it('is unavailable when the relay throws or answers something else; the token is in no log', async () => {
    for (const kept of [new Error(`bad token ${TOKEN}`), { ok: true }, 'next']) {
      const log = vi.fn();
      const console = vi.spyOn(globalThis.console, 'log').mockImplementation(() => undefined);
      expect(await relayOf(deskOf(null, kept), log).handOff(CONNECTION, TOKEN)).toEqual({
        ok: false,
        refusal: 'unavailable',
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain(TOKEN);
      expect(console).not.toHaveBeenCalled();
      console.mockRestore();
    }
  });
});

describe('which relay', () => {
  it('uses the binding when it is a desk, called as its methods', async () => {
    class Stub {
      readonly seen: unknown[] = [];
      async ask(req: string) {
        this.seen.push(req);
        return { ok: true, app: 'Claude', host: 'claude.ai' };
      }
      async keep(handOff: unknown) {
        this.seen.push(handOff);
        return { ok: true, next: vueltaHref(REQ) };
      }
    }
    const stub = new Stub();
    const relay = boundRelay(stub, vi.fn());
    expect(await relay?.check(ASK)).toBe('ok');
    expect(await relay?.handOff(CONNECTION, TOKEN)).toMatchObject({ ok: true });
    expect(stub.seen).toHaveLength(2);
    // An RPC stub may be a callable object.
    const callable = Object.assign(() => undefined, { ask: stub.ask, keep: stub.keep });
    expect(boundRelay(callable)).not.toBeNull();
  });

  it('has no relay without a desk-shaped binding', () => {
    for (const binding of [undefined, null, 'MCP_HANDOFF', 7, {}, { ask: () => 1 }]) {
      expect(boundRelay(binding)).toBeNull();
    }
  });

  it('stands the fixture relay in only when the data is the fixture', async () => {
    expect(relayFrom({ binding: undefined, dataSource: 'fixture' })).toBe(fixtureRelay);
    expect(relayFrom({ binding: undefined, dataSource: 'till' })).toBeNull();
    expect(relayFrom({ binding: undefined, dataSource: undefined })).toBeNull();
    const bound = relayFrom({ binding: deskOf(null), dataSource: 'fixture' });
    expect(bound).not.toBe(fixtureRelay);
    expect(await fixtureRelay.check(ASK)).toBe('ok');
    expect(await fixtureRelay.handOff(CONNECTION, TOKEN)).toEqual({ ok: true, next: null });
  });

  it('builds /vuelta on the relay’s origin', () => {
    expect(vueltaHref(REQ)).toBe('https://mcp.numinia.com/vuelta?req=req_0123456789abcdef');
  });
});
