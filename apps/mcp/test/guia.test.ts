// SPDX-FileCopyrightText: 2026 Numen Games S.L.
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { CALLS_TOPIC, GUIDE, GUIDE_HINTS, GUIDE_PAGES, GUIDE_TOOL, callGuide } from '../src/guia';
import { serverInstructions } from '../src/herramientas-cuerpo';

const textOf = (result: ReturnType<typeof callGuide>): string => result.content[0]?.text ?? '';

describe('the guide', () => {
  it('is a read-only tool with one optional argument', () => {
    expect(GUIDE.name).toBe(GUIDE_TOOL);
    expect(GUIDE.annotations.readOnlyHint).toBe(true);
    expect(GUIDE.inputSchema.additionalProperties).toBe(false);
    expect(Object.keys(GUIDE.inputSchema.properties)).toEqual(['tema']);
    expect(GUIDE.description).toContain(CALLS_TOPIC);
  });

  it('lists the pages with no argument, or with {}', () => {
    for (const args of [undefined, null, {}]) {
      const result = callGuide(args);
      expect(result.isError).toBeUndefined();
      expect(result.structuredContent?.pages).toEqual([
        { tema: CALLS_TOPIC, para: GUIDE_PAGES.get(CALLS_TOPIC)?.about },
      ]);
      expect(textOf(result)).toContain(`- ${CALLS_TOPIC}:`);
    }
  });

  it('gives the page on calls: the ways to call, the loop, the answer, the hearing, no spam', () => {
    const result = callGuide({ tema: CALLS_TOPIC });
    const text = textOf(result);
    expect(result.isError).toBeUndefined();
    for (const word of [
      '« · IA»',
      '/your-name',
      'esperar_llamada',
      'llamadas',
      'decir',
      'gesto',
      'quien_soy',
      'burbuja',
      'dormida',
      'spam',
      'never orders',
    ]) {
      expect(text).toContain(word);
    }
    expect(result.structuredContent).toMatchObject({
      tema: CALLS_TOPIC,
      siguiente: [{ tema: 'quien_soy' }, { tema: 'mundos' }],
    });
    // A page that fits a pocket: about 700 tokens at 4 characters each.
    expect(text.length).toBeLessThan(3200);
  });

  it('reads the topic without caring for case or spaces', () => {
    expect(callGuide({ tema: '  LLAMADAS ' }).structuredContent?.tema).toBe(CALLS_TOPIC);
  });

  it('answers a topic that does not exist with the index, not an error', () => {
    for (const tema of ['construir', 'constructor', '__proto__']) {
      const result = callGuide({ tema });
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toContain(`There is no page «${tema}»`);
      expect(textOf(result)).toContain(`- ${CALLS_TOPIC}:`);
    }
  });

  it('refuses arguments it does not take', () => {
    for (const args of [{ tema: 3 }, { other: 'x' }, ['llamadas'], 'llamadas']) {
      const result = callGuide(args);
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('one optional argument');
    }
  });

  it('is pointed to by the instructions and by the note of «entrar», each in one line', () => {
    expect(serverInstructions('llamada')).toContain(GUIDE_HINTS.instructions);
    expect(serverInstructions('todo')).toContain(GUIDE_HINTS.instructions);
    for (const line of Object.values(GUIDE_HINTS)) {
      expect(line).toContain('esperar_llamada');
      expect(line).toContain(`${GUIDE_TOOL}» {"tema": "${CALLS_TOPIC}"}`);
      expect(line).not.toContain('\n');
    }
    // The instructions stay short enough for a client that cuts them at 2 KB.
    expect(serverInstructions('todo').length).toBeLessThan(2000);
  });
});
