/**
 * The citizen's card inside the sheet's record: the portrait and the profile
 * survive a round trip, stay out of the Notes, leave the rest of the sheet
 * untouched, and nothing typed reaches a link unencoded.
 */

import { describe, expect, it } from 'vitest';
import {
  CITIZEN_LIMITS,
  PORTRAIT_MAX_CHARS,
  SHEET_RECORD_KEY,
  badLinks,
  citizenFromMarkdown,
  citizenToMarkdown,
  cleanCitizen,
  emptyCitizen,
  isBlankCitizen,
  isPortrait,
  linkLabel,
  oneLine,
  portraitSize,
  webLink,
  withCitizen,
  type CitizenProfile,
} from '../citizen-profile';
import { STORED_KEYS } from '../consent';
import { emptySheet, sheetFromMarkdown, sheetToMarkdown } from '../lap/sheet';

const PHOTO = 'data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAA==';

const RIMA: CitizenProfile = {
  photo: PHOTO,
  name: 'Rima',
  line: 'Cartógrafa de puertas olvidadas',
  place: 'Madrid',
  links: ['https://example.org/rima', 'https://rima.example/'],
};

describe('the record the card lives in', () => {
  it('is the sheet’s own key, already named by the cookie policy list', () => {
    expect(SHEET_RECORD_KEY).toBe('numinia-lap-personaje');
    expect(STORED_KEYS as readonly string[]).toContain(SHEET_RECORD_KEY);
  });
});

describe('a blank card', () => {
  it('is blank, and a card with anything in it is not', () => {
    expect(isBlankCitizen(emptyCitizen())).toBe(true);
    for (const patch of [
      { photo: PHOTO },
      { name: 'Rima' },
      { line: 'x' },
      { place: 'Madrid' },
      { links: ['https://a.example'] },
    ]) {
      expect(isBlankCitizen({ ...emptyCitizen(), ...patch })).toBe(false);
    }
  });

  it('writes nothing, so a sheet without a card keeps its old bytes', () => {
    expect(citizenToMarkdown(emptyCitizen())).toBe('');
  });
});

describe('the portrait', () => {
  it('accepts inline PNG, JPEG and WebP, nothing else', () => {
    expect(isPortrait(PHOTO)).toBe(true);
    expect(isPortrait('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isPortrait('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    for (const bad of [
      undefined,
      42,
      '',
      'https://example.org/me.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:text/html;base64,PGI+',
      'data:image/png;base64,abc)def',
      `data:image/png;base64,${'A'.repeat(PORTRAIT_MAX_CHARS)}`,
    ]) {
      expect(isPortrait(bad)).toBe(false);
    }
  });

  it('is drawn at 256 px on its longest side at most, never enlarged', () => {
    expect(portraitSize(1024, 768)).toEqual({ width: 256, height: 192 });
    expect(portraitSize(600, 1200)).toEqual({ width: 128, height: 256 });
    expect(portraitSize(100, 80)).toEqual({ width: 100, height: 80 });
    expect(portraitSize(5000, 2, 256)).toEqual({ width: 256, height: 1 });
    expect(portraitSize(400, 400, 96)).toEqual({ width: 96, height: 96 });
  });

  it('refuses a picture the browser could not measure', () => {
    expect(portraitSize(0, 100)).toBeNull();
    expect(portraitSize(100, Number.NaN)).toBeNull();
    expect(portraitSize(Number.POSITIVE_INFINITY, 10)).toBeNull();
  });
});

describe('one line of text', () => {
  it('folds whitespace, keeps the table cell whole and cuts at whole characters', () => {
    expect(oneLine('  Rima\n la   Errante ', 60)).toBe('Rima la Errante');
    expect(oneLine('a | b', 60)).toBe('a / b');
    expect(oneLine('ab😀cd', 3)).toBe('ab😀');
    expect(oneLine('abc de', 4)).toBe('abc');
  });
});

describe('a web link', () => {
  it('keeps a real address and adds https:// to a bare one', () => {
    expect(webLink('https://example.org/rima')).toBe('https://example.org/rima');
    expect(webLink('example.org/rima')).toBe('https://example.org/rima');
    expect(webLink('  http://example.org  ')).toBe('http://example.org/');
    expect(webLink('https://example.org:8443/a?b=c d&e=f#top')).toBeNull(); // a space is not a link
    expect(webLink('https://example.org:8443/a?b=c&e=f#top')).toBe(
      'https://example.org:8443/a?b=c&e=f#top',
    );
  });

  it('encodes every part it rebuilds, so nothing typed reaches an href raw', () => {
    expect(webLink('https://example.org/"><script>x</script>')).toBe(
      'https://example.org/%22%3E%3Cscript%3Ex%3C/script%3E',
    );
    expect(webLink('https://example.org/a%zz')).toBe('https://example.org/a%25zz');
    expect(webLink('https://example.org/#%E0%A4%A')).toBe('https://example.org/#%25E0%25A4%25A');
    expect(webLink('https://example.org/caf%C3%A9')).toBe('https://example.org/caf%C3%A9');
  });

  it('refuses anything that is not an http(s) address on a real host', () => {
    for (const bad of [
      '',
      '   ',
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      'data:text/html,hi',
      'mailto:rima@example.org',
      'ftp://example.org/',
      'https://localhost/',
      'https://someone@example.org/',
      'https://:pass@example.org/',
      'https://exa mple.org',
      'https://[',
      `https://example.org/${'a'.repeat(CITIZEN_LIMITS.link)}`,
    ]) {
      expect(webLink(bad), bad).toBeNull();
    }
  });

  it('reads short on the card: host and path, no scheme, no www.', () => {
    expect(linkLabel('https://www.example.org/rima/')).toBe('example.org/rima');
    expect(linkLabel('https://rima.example/')).toBe('rima.example');
    expect(linkLabel('https://example.org/caf%C3%A9')).toBe('example.org/café');
    expect(linkLabel(`https://example.org/${'a'.repeat(60)}`)).toHaveLength(40);
    expect(linkLabel('not a url')).toBe('not a url');
  });

  it('tells a form which of its links are not addresses', () => {
    expect(badLinks(['example.org', '', 'nope', 'javascript:x'])).toEqual([2, 3]);
    expect(badLinks([])).toEqual([]);
  });
});

describe('cleaning a draft', () => {
  it('keeps what is good and drops what is not', () => {
    const clean = cleanCitizen({
      photo: 'https://example.org/me.png',
      name: ' Rima ',
      line: 'Una\nlínea',
      place: 'Madrid | Lavapiés',
      links: ['example.org', undefined, 'javascript:x', 'a.example', 'b.example', 'c.example'],
    });
    expect(clean).toEqual({
      photo: '',
      name: 'Rima',
      line: 'Una línea',
      place: 'Madrid / Lavapiés',
      links: ['https://example.org/', 'https://a.example/', 'https://b.example/'],
    });
    expect(cleanCitizen({})).toEqual(emptyCitizen());
  });

  it('cuts every field at its limit', () => {
    const long = 'x'.repeat(500);
    const clean = cleanCitizen({ name: long, line: long, place: long });
    expect(clean.name).toHaveLength(CITIZEN_LIMITS.name);
    expect(clean.line).toHaveLength(CITIZEN_LIMITS.line);
    expect(clean.place).toHaveLength(CITIZEN_LIMITS.place);
  });
});

describe('the card as Markdown', () => {
  it('round-trips a full card', () => {
    const markdown = citizenToMarkdown(RIMA);
    expect(markdown).toContain('## Portrait\n\n![portrait](data:image/webp;base64,');
    expect(markdown).toContain('| link3 |  |');
    expect(citizenFromMarkdown(markdown)).toEqual(RIMA);
  });

  it('writes only the sections that have something', () => {
    const photoOnly = citizenToMarkdown({ ...emptyCitizen(), photo: PHOTO });
    expect(photoOnly).toContain('## Portrait');
    expect(photoOnly).not.toContain('## Citizen');
    const linksOnly = citizenToMarkdown({ ...emptyCitizen(), links: ['https://a.example/'] });
    expect(linksOnly).not.toContain('## Portrait');
    expect(citizenFromMarkdown(linksOnly).links).toEqual(['https://a.example/']);
    for (const patch of [{ name: 'Rima' }, { line: 'Una línea' }, { place: 'Madrid' }]) {
      const markdown = citizenToMarkdown({ ...emptyCitizen(), ...patch });
      expect(markdown).toContain('## Citizen');
      expect(citizenFromMarkdown(markdown)).toEqual({ ...emptyCitizen(), ...patch });
    }
  });

  it('reads a record with no card, or a broken one, as blank', () => {
    expect(citizenFromMarkdown('')).toEqual(emptyCitizen());
    expect(citizenFromMarkdown(sheetToMarkdown(emptySheet()))).toEqual(emptyCitizen());
    expect(
      citizenFromMarkdown(
        '## Portrait\n\nno image here\n![x](javascript:alert(1))\n\n## Citizen\n| name |',
      ),
    ).toEqual(emptyCitizen());
  });

  it('never takes a card from inside the Notes', () => {
    const notes = `## Notes\n\n${citizenToMarkdown(RIMA)}`;
    expect(citizenFromMarkdown(notes)).toEqual(emptyCitizen());
  });
});

describe('the card inside the sheet', () => {
  it('travels with the sheet file and leaves the sheet as it was', () => {
    const sheet = { ...emptySheet(), citizen: RIMA, notes: 'Primera crónica.' };
    sheet.identity.name = 'Aliseda';
    const markdown = sheetToMarkdown(sheet);
    expect(markdown.indexOf('## Citizen')).toBeLessThan(markdown.indexOf('## Notes'));
    const back = sheetFromMarkdown(markdown);
    expect(back.citizen).toEqual(RIMA);
    expect(back.notes).toBe('Primera crónica.');
    expect(back.identity.name).toBe('Aliseda');
  });

  it('is replaced by Resumen without touching the sheet or its notes', () => {
    const sheet = emptySheet();
    sheet.identity.name = 'Aliseda';
    sheet.notes = 'Línea uno.\n## No es un título';
    const before = sheetToMarkdown(sheet);
    const withCard = withCitizen(before, RIMA);
    expect(sheetFromMarkdown(withCard)).toEqual({ ...sheet, citizen: RIMA });
    const renamed = withCitizen(withCard, { ...RIMA, name: 'Rima la Errante', photo: '' });
    expect(citizenFromMarkdown(renamed)).toEqual({ ...RIMA, name: 'Rima la Errante', photo: '' });
    expect(renamed.match(/## Citizen/g)).toHaveLength(1);
    expect(renamed).not.toContain('## Portrait');
    // Taking the card away gives the sheet back byte for byte (bar the end).
    expect(withCitizen(withCard, emptyCitizen()).trimEnd()).toBe(before.trimEnd());
  });

  it('starts a record of its own when there is no sheet yet, and empties it again', () => {
    const record = withCitizen('', RIMA);
    expect(citizenFromMarkdown(record)).toEqual(RIMA);
    expect(record.endsWith('\n')).toBe(true);
    expect(withCitizen(record, emptyCitizen())).toBe('');
    expect(withCitizen('## Notes\n\nSolo notas.\n', RIMA)).toMatch(/^## Portrait[\s\S]*## Notes/);
  });
});
