/**
 * The sprite's helper: a self-hosted inline SVG becomes a <symbol> (its
 * viewBox and children), under one id scheme for every place that draws it.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { svgParts, symbolId } from '../svg-sprite';

const icons = join(process.cwd(), '..', '..', 'packages', 'ui', 'src');

describe('svgParts', () => {
  it('splits a Phosphor icon into its 256 viewBox and its path', () => {
    const raw = readFileSync(join(icons, 'icons', 'house.svg'), 'utf8');
    const parts = svgParts(raw);
    expect(parts.viewBox).toBe('0 0 256 256');
    expect(parts.body.startsWith('<path d="')).toBe(true);
    expect(parts.body).not.toContain('<svg');
    expect(parts.body).not.toContain('</svg>');
  });

  it('keeps a brand mark whole: the Khepri, two paths, its own viewBox', () => {
    const raw = readFileSync(join(icons, 'assets', 'brand', 'Khepri_Logo.svg'), 'utf8');
    const parts = svgParts(raw);
    expect(parts.viewBox).toBe('0 0 75.44 75.53');
    expect(parts.body.match(/<path /g)).toHaveLength(2);
  });

  it('trims the whitespace around the children', () => {
    expect(svgParts('<svg viewBox="0 0 8 8">\n  <circle r="4"/>\n</svg>\n')).toEqual({
      viewBox: '0 0 8 8',
      body: '<circle r="4"/>',
    });
  });

  it('refuses what is not an inline SVG', () => {
    expect(() => svgParts('<img src="x.svg">')).toThrow('not an inline SVG');
    expect(() => svgParts('<svg viewBox="0 0 8 8"><path/>')).toThrow('not an inline SVG');
    expect(() => svgParts('</svg><svg viewBox="0 0 8 8">')).toThrow('not an inline SVG');
  });

  it('refuses an SVG without a viewBox: a symbol could not scale it', () => {
    expect(() => svgParts('<svg width="8" height="8"><path/></svg>')).toThrow('viewBox');
  });
});

describe('symbolId', () => {
  it('prefixes the icon name, the scheme every <use> points at', () => {
    expect(symbolId('house-fill')).toBe('i-house-fill');
    expect(symbolId('khepri')).toBe('i-khepri');
  });
});
