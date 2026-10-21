import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_PRESENCE,
  agentPassIa,
  agentPresenceOf,
  applyAgentPresenceChange,
  parseAgentPassIa,
  parseAgentPresence,
  parseAgentPresenceChange,
  parseAgentResponds,
  parseAgentWorlds,
  storedAgentPresence,
} from '../src/validators/agent-presence.js';
import type { AgentPresence } from '../src/types/agent-presence.js';

const WALLET = `0x${'ab'.repeat(20)}`;

const problems = (read: { ok: boolean; problems?: readonly string[] }): readonly string[] =>
  read.ok ? [] : (read.problems as readonly string[]);

describe('the default presence', () => {
  it('is the house robot in a 4 m sphere seen when near, called by name, /name and button', () => {
    expect(DEFAULT_AGENT_PRESENCE).toEqual({
      cuerpo: { tipo: 'casa', modelo: 0 },
      burbuja: { forma: 'esfera', radio: 4, visible: 'al-acercarte' },
      llamada: { nombre: true, barra: true, boton: true, solo_dentro: true },
      oye: 'llamada',
      quedarse_h: 0,
    });
    expect(parseAgentPresence(DEFAULT_AGENT_PRESENCE)).toEqual({
      ok: true,
      value: DEFAULT_AGENT_PRESENCE,
    });
  });
});

describe('reading a whole presence', () => {
  const whole = {
    cuerpo: { tipo: 'casa', modelo: 999 },
    burbuja: { forma: 'caja', radio: 12, visible: 'siempre' },
    llamada: {
      nombre: false,
      barra: true,
      boton: false,
      solo_dentro: false,
      frase: '  agente, responde ',
    },
    oye: 'todo',
    quedarse_h: 24,
  };

  it('accepts the edges, trims the phrase', () => {
    const read = parseAgentPresence(whole);
    expect(read.ok && read.value.llamada.frase).toBe('agente, responde');
    expect(read.ok && read.value.burbuja).toEqual({ forma: 'caja', radio: 12, visible: 'siempre' });
    expect(parseAgentPresence({ ...whole, burbuja: { ...whole.burbuja, radio: 2 } }).ok).toBe(true);
  });

  it.each([
    ['an unknown top-level field', { ...whole, extra: 1 }],
    ['an unknown body kind', { ...whole, cuerpo: { tipo: 'vrm', modelo: 0 } }],
    ['a model past 999', { ...whole, cuerpo: { tipo: 'casa', modelo: 1000 } }],
    ['a negative model', { ...whole, cuerpo: { tipo: 'casa', modelo: -1 } }],
    ['a fractional model', { ...whole, cuerpo: { tipo: 'casa', modelo: 1.5 } }],
    ['an unknown shape', { ...whole, burbuja: { ...whole.burbuja, forma: 'cubo' } }],
    ['a radius of 1', { ...whole, burbuja: { ...whole.burbuja, radio: 1 } }],
    ['a radius of 13', { ...whole, burbuja: { ...whole.burbuja, radio: 13 } }],
    ['a radius of 4.5', { ...whole, burbuja: { ...whole.burbuja, radio: 4.5 } }],
    ['an unknown visibility', { ...whole, burbuja: { ...whole.burbuja, visible: 'a veces' } }],
    ['a blank phrase', { ...whole, llamada: { ...whole.llamada, frase: '   ' } }],
    ['a phrase of 41', { ...whole, llamada: { ...whole.llamada, frase: 'x'.repeat(41) } }],
    [
      'a phrase with a control character',
      { ...whole, llamada: { ...whole.llamada, frase: 'a\nb' } },
    ],
    ['a non-boolean call switch', { ...whole, llamada: { ...whole.llamada, nombre: 'yes' } }],
    ['an unknown hearing step', { ...whole, oye: 'siempre' }],
    ['a stay of 2 hours', { ...whole, quedarse_h: 2 }],
    ['a missing group', { ...whole, burbuja: undefined }],
    ['not an object', 'presence'],
  ])('refuses %s', (_name, value) => {
    expect(problems(parseAgentPresence(value)).length).toBeGreaterThan(0);
  });

  it('says where it went wrong, once per line', () => {
    const read = parseAgentPresence({
      ...whole,
      burbuja: { ...whole.burbuja, radio: 40 },
      quedarse_h: 3,
    });
    const lines = problems(read);
    expect(lines.some((line) => line.startsWith('burbuja.radio: '))).toBe(true);
    expect(
      lines.some((line) => line.startsWith('quedarse_h: ') && line.includes('0, 1, 4, 24')),
    ).toBe(true);
    expect(new Set(lines).size).toBe(lines.length);
    expect(problems(parseAgentPresence(null))[0]).toMatch(/^Invalid input/);
  });
});

describe('reading a change', () => {
  it('accepts part of a group, a phrase to clear, the ladder and the stay', () => {
    expect(parseAgentPresenceChange({ burbuja: { radio: 6 } })).toEqual({
      ok: true,
      value: { burbuja: { radio: 6 } },
    });
    expect(parseAgentPresenceChange({ llamada: { frase: null, boton: false } }).ok).toBe(true);
    expect(parseAgentPresenceChange({ oye: 'burbuja', quedarse_h: 4 }).ok).toBe(true);
    expect(parseAgentPresenceChange({ cuerpo: { modelo: 2 } }).ok).toBe(true);
  });

  it.each([
    ['nothing', {}],
    ['not an object', []],
    ['an unknown field', { responde: {} }],
    ['an unknown field in a group', { burbuja: { color: 'rojo' } }],
    ['a radius out of range', { burbuja: { radio: 20 } }],
    ['a blank phrase', { llamada: { frase: ' ' } }],
    ['a number as the phrase', { llamada: { frase: 4 } }],
    ['a stay of 5', { quedarse_h: 5 }],
    ['a hearing step that does not exist', { oye: 'nada' }],
  ])('refuses %s', (_name, value) => {
    expect(problems(parseAgentPresenceChange(value)).length).toBeGreaterThan(0);
  });

  it('applies it: only what it names moves, null drops the phrase', () => {
    const phrased = applyAgentPresenceChange(DEFAULT_AGENT_PRESENCE, {
      llamada: { frase: 'ven aquí', solo_dentro: false },
      burbuja: { forma: 'cupula' },
      cuerpo: { modelo: 2 },
      oye: 'burbuja',
      quedarse_h: 1,
    });
    expect(phrased).toEqual({
      cuerpo: { tipo: 'casa', modelo: 2 },
      burbuja: { forma: 'cupula', radio: 4, visible: 'al-acercarte' },
      llamada: { nombre: true, barra: true, boton: true, solo_dentro: false, frase: 'ven aquí' },
      oye: 'burbuja',
      quedarse_h: 1,
    });
    const kept = applyAgentPresenceChange(phrased, { burbuja: { radio: 9 } });
    expect(kept.llamada.frase).toBe('ven aquí');
    expect(kept.burbuja.radio).toBe(9);
    expect(kept.oye).toBe('burbuja');
    const cleared = applyAgentPresenceChange(phrased, { llamada: { frase: null } });
    expect('frase' in cleared.llamada).toBe(false);
    expect(phrased.llamada.frase).toBe('ven aquí');
  });
});

describe('what the till stores', () => {
  it('stores nothing for the default and the canonical JSON for the rest', () => {
    expect(storedAgentPresence(DEFAULT_AGENT_PRESENCE)).toBeNull();
    const changed: AgentPresence = applyAgentPresenceChange(DEFAULT_AGENT_PRESENCE, {
      llamada: { frase: 'hola' },
      quedarse_h: 4,
    });
    const stored = storedAgentPresence(changed) as string;
    expect(JSON.parse(stored)).toEqual(changed);
    expect(Object.keys(JSON.parse(stored))).toEqual([
      'cuerpo',
      'burbuja',
      'llamada',
      'oye',
      'quedarse_h',
    ]);
    expect(stored).toContain('"frase":"hola"');
    // The same presence built in another key order stores the same text.
    const shuffled = {
      quedarse_h: 4,
      oye: 'llamada',
      llamada: { frase: 'hola', solo_dentro: true, boton: true, barra: true, nombre: true },
      burbuja: { visible: 'al-acercarte', radio: 4, forma: 'esfera' },
      cuerpo: { modelo: 0, tipo: 'casa' },
    } as AgentPresence;
    expect(storedAgentPresence(shuffled)).toBe(stored);
  });

  it('reads back what it wrote, and the default for null, rot or an old shape', () => {
    const changed = applyAgentPresenceChange(DEFAULT_AGENT_PRESENCE, { burbuja: { radio: 7 } });
    expect(agentPresenceOf(storedAgentPresence(changed))).toEqual(changed);
    expect(agentPresenceOf(null)).toBe(DEFAULT_AGENT_PRESENCE);
    expect(agentPresenceOf('{not json')).toBe(DEFAULT_AGENT_PRESENCE);
    expect(agentPresenceOf('{"cuerpo":{}}')).toBe(DEFAULT_AGENT_PRESENCE);
  });
});

describe('where the AI lives', () => {
  it('reads all of them, or one to fifty distinct worlds', () => {
    expect(parseAgentWorlds({ todos: true })).toEqual({ ok: true, value: { todos: true } });
    expect(parseAgentWorlds({ mundos: ['la-torre', 'plaza2'] })).toEqual({
      ok: true,
      value: { mundos: ['la-torre', 'plaza2'] },
    });
    const fifty = Array.from({ length: 50 }, (_, index) => `mundo-${index}`);
    expect(parseAgentWorlds({ mundos: fifty }).ok).toBe(true);
  });

  it.each([
    ['todos: false', { todos: false }],
    ['both ways', { todos: true, mundos: ['a'] }],
    ['no worlds', { mundos: [] }],
    ['51 worlds', { mundos: Array.from({ length: 51 }, (_, index) => `m-${index}`) }],
    ['a repeated world', { mundos: ['a', 'a'] }],
    ['an upper-case id', { mundos: ['La-Torre'] }],
    ['a double hyphen', { mundos: ['la--torre'] }],
    ['an id of 64', { mundos: ['a'.repeat(64)] }],
    ['a non-string id', { mundos: [4] }],
    ['nothing', {}],
    ['not an object', null],
  ])('refuses %s', (_name, value) => {
    expect(problems(parseAgentWorlds(value)).length).toBeGreaterThan(0);
  });
});

describe('the block of the world pass', () => {
  it('reads who answers: community and a name or a wallet', () => {
    expect(parseAgentResponds({ comunidad: ' La Torre ', nombre: 'Ana' })).toEqual({
      ok: true,
      value: { comunidad: 'La Torre', nombre: 'Ana' },
    });
    expect(parseAgentResponds({ comunidad: 'La Torre', cartera: WALLET }).ok).toBe(true);
    expect(problems(parseAgentResponds({ comunidad: '' })).length).toBeGreaterThan(0);
    expect(problems(parseAgentResponds({ comunidad: 'x'.repeat(41) })).length).toBeGreaterThan(0);
    expect(
      problems(parseAgentResponds({ comunidad: 'a', cartera: '0x12…ab' })).length,
    ).toBeGreaterThan(0);
    expect(
      problems(parseAgentResponds({ comunidad: 'a', cartera: WALLET.toUpperCase() })).length,
    ).toBeGreaterThan(0);
  });

  it('is built whole from the presence, and the engine’s own reading accepts it', () => {
    const presence = applyAgentPresenceChange(DEFAULT_AGENT_PRESENCE, {
      oye: 'todo',
      llamada: { frase: 'ven' },
      quedarse_h: 4,
    });
    const ia = agentPassIa(presence, { comunidad: 'La Torre', cartera: WALLET });
    expect(ia).toEqual({
      cuerpo: { tipo: 'casa', modelo: 0 },
      burbuja: { forma: 'esfera', radio: 4, visible: 'al-acercarte' },
      llamada: { nombre: true, barra: true, boton: true, solo_dentro: true, frase: 'ven' },
      responde: { comunidad: 'La Torre', cartera: WALLET },
      quedarse_h: 4,
    });
    expect('oye' in ia).toBe(false);
    expect(parseAgentPassIa(ia)).toEqual({ ok: true, value: ia });
    expect(parseAgentPassIa({ responde: { comunidad: 'La Torre' } }).ok).toBe(true);
    expect(
      problems(parseAgentPassIa({ cuerpo: { tipo: 'casa', modelo: 0 } })).length,
    ).toBeGreaterThan(0);
    expect(problems(parseAgentPassIa({ ...ia, oye: 'todo' })).length).toBeGreaterThan(0);
  });
});
