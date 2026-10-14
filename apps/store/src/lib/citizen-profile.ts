/**
 * The citizen's own face in the player area: a portrait and a short profile
 * — the name shown, one line about you, a city or zone, up to three links.
 * Pablo asked for both on Resumen (video walkthrough, 2026-10-14): «la foto
 * del personaje» and «editar mi perfil personal».
 *
 * Nothing new is stored. The card lives in the sheet's own record
 * (`numinia-lap-personaje`, LEG-003 §3.1) as two sections of the same
 * portable Markdown, written before `## Notes` (Notes runs to the end of
 * the file):
 *
 *   ## Portrait
 *
 *   ![portrait](data:image/webp;base64,…)
 *
 *   ## Citizen
 *   | field | value |
 *   | --- | --- |
 *   | name | Rima |
 *   | line | Cartógrafa de puertas |
 *   | place | Madrid |
 *   | link1 | https://example.org/rima |
 *
 * So the card on Resumen and the sheet read one file, an exported sheet
 * carries the portrait, and nothing leaves the device. Pure: no DOM, no
 * storage — the pages read and write the record, this module the text.
 * No zod (it ships in the card's script and the sheet's island).
 */

/** The sheet's record on this device (LEG-003 §3.1): the sheet and its card. */
export const SHEET_RECORD_KEY = 'numinia-lap-personaje';

export interface CitizenProfile {
  /** '' or a `data:image/(png|jpeg|webp);base64,…` URL (see isPortrait). */
  readonly photo: string;
  readonly name: string;
  readonly line: string;
  readonly place: string;
  /** Up to three web addresses, already normalised by webLink. */
  readonly links: readonly string[];
}

/** What a form or a file may hand in before cleaning. */
export interface CitizenDraft {
  readonly photo?: string | undefined;
  readonly name?: string | undefined;
  readonly line?: string | undefined;
  readonly place?: string | undefined;
  readonly links?: readonly (string | undefined)[] | undefined;
}

/** Lengths in characters (a name, one line, a place, a link) and how many links. */
export const CITIZEN_LIMITS = { name: 60, line: 140, place: 60, link: 300, links: 3 } as const;

/** The longest side a portrait keeps, in pixels: the card draws it at 96. */
export const PORTRAIT_SIDE = 256;

/** A larger data URL is refused (~150 KB of image; a 256 px WebP is ~20 KB). */
export const PORTRAIT_MAX_CHARS = 200_000;

const PORTRAIT_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const IMAGE_LINE_RE = /^!\[[^\]]*\]\(([^)\s]+)\)$/;
const ROW_RE = /^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/;
const CARD_SECTIONS = ['Portrait', 'Citizen'] as const;

export function emptyCitizen(): CitizenProfile {
  return { photo: '', name: '', line: '', place: '', links: [] };
}

export function isBlankCitizen(citizen: CitizenProfile): boolean {
  return (
    citizen.photo === '' &&
    citizen.name === '' &&
    citizen.line === '' &&
    citizen.place === '' &&
    citizen.links.length === 0
  );
}

/** A portrait the card may draw: an inline PNG, JPEG or WebP, not too big. */
export function isPortrait(value: unknown): value is string {
  return typeof value === 'string' && value.length <= PORTRAIT_MAX_CHARS && PORTRAIT_RE.test(value);
}

/**
 * The size a picture is drawn at to become a portrait: its longest side at
 * most `side`, the proportions kept, never enlarged. Null for a picture the
 * browser could not measure.
 */
export function portraitSize(
  width: number,
  height: number,
  side: number = PORTRAIT_SIDE,
): { width: number; height: number } | null {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }
  const scale = Math.min(1, side / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * One line of plain text for a table cell: whitespace and line breaks fold
 * into single spaces, the cell mark `|` becomes `/`, and the text is cut at
 * `max` characters (whole characters, never half an emoji).
 */
export function oneLine(value: string, max: number): string {
  const folded = value.replace(/\s+/g, ' ').replaceAll('|', '/').trim();
  return Array.from(folded).slice(0, max).join('').trim();
}

function decoded(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

/**
 * A web address as the card links it, or null when the text is not one.
 * A bare `example.org/rima` gains `https://`; only http(s) addresses with a
 * real host name and no credentials pass. The link is rebuilt from a fixed
 * scheme and percent-encoded parts — the one helper every profile link goes
 * through, so no typed text reaches an href unencoded.
 */
export function webLink(value: string): string | null {
  const raw = value.trim();
  if (raw === '' || /\s/.test(raw)) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!url.hostname.includes('.') || url.username !== '' || url.password !== '') return null;
  const scheme = url.protocol === 'http:' ? 'http' : 'https';
  const port = url.port === '' ? '' : `:${encodeURIComponent(url.port)}`;
  const path = url.pathname
    .split('/')
    .map((segment) => encodeURIComponent(decoded(segment)))
    .join('/');
  const query = [...url.searchParams]
    .map(([key, entry]) => `${encodeURIComponent(key)}=${encodeURIComponent(entry)}`)
    .join('&');
  const hash = url.hash.length > 1 ? `#${encodeURIComponent(decoded(url.hash.slice(1)))}` : '';
  const href = `${scheme}://${encodeURIComponent(url.hostname)}${port}${path}${query === '' ? '' : `?${query}`}${hash}`;
  return href.length <= CITIZEN_LIMITS.link ? href : null;
}

/** How a link reads on the card: host and path, no scheme, no `www.`, short. */
export function linkLabel(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return oneLine(href, 40);
  }
  const path = decoded(url.pathname).replace(/\/+$/, '');
  const label = `${url.hostname.replace(/^www\./, '')}${path}`;
  const chars = Array.from(label);
  return chars.length > 40 ? `${chars.slice(0, 39).join('')}…` : label;
}

/** Positions of the links a form holds that are not web addresses (blanks pass). */
export function badLinks(links: readonly string[]): number[] {
  return links.flatMap((link, index) =>
    link.trim() !== '' && webLink(link) === null ? [index] : [],
  );
}

/** A clean card from whatever a form or a file handed in: bad parts drop out. */
export function cleanCitizen(draft: CitizenDraft): CitizenProfile {
  const links = (draft.links ?? [])
    .map((link) => (link === undefined ? null : webLink(link)))
    .filter((link): link is string => link !== null)
    .slice(0, CITIZEN_LIMITS.links);
  return {
    photo: isPortrait(draft.photo) ? draft.photo : '',
    name: oneLine(draft.name ?? '', CITIZEN_LIMITS.name),
    line: oneLine(draft.line ?? '', CITIZEN_LIMITS.line),
    place: oneLine(draft.place ?? '', CITIZEN_LIMITS.place),
    links,
  };
}

/**
 * The card's two sections, each ending in a blank line, or '' for a blank
 * card — a sheet without a card is written exactly as before.
 */
export function citizenToMarkdown(citizen: CitizenProfile): string {
  const blocks: string[] = [];
  if (citizen.photo !== '') blocks.push(`## Portrait\n\n![portrait](${citizen.photo})\n`);
  const { name, line, place, links } = citizen;
  if (name !== '' || line !== '' || place !== '' || links.length > 0) {
    const rows: ReadonlyArray<readonly [string, string]> = [
      ['name', name],
      ['line', line],
      ['place', place],
      ...[0, 1, 2].map((index): readonly [string, string] => [
        `link${index + 1}`,
        links[index] ?? '',
      ]),
    ];
    blocks.push(
      ['## Citizen', '| field | value |', '| --- | --- |']
        .concat(
          rows.map(([key, value]) => `| ${key} | ${value} |`),
          [''],
        )
        .join('\n'),
    );
  }
  return blocks.join('\n');
}

/** The record split at its `## Notes` line: Notes runs to the end of the file. */
function splitAtNotes(markdown: string): { head: string; notes: string } {
  const match = /^## Notes[ \t]*$/m.exec(markdown);
  if (!match) return { head: markdown, notes: '' };
  return { head: markdown.slice(0, match.index), notes: markdown.slice(match.index) };
}

/** The lines of one `## <name>` section of the head (before Notes). */
function sectionLines(head: string, name: string): string[] {
  const lines: string[] = [];
  let inside = false;
  for (const line of head.split('\n')) {
    if (line.startsWith('## ')) {
      inside = line.slice(3).trim() === name;
      continue;
    }
    if (inside) lines.push(line.trim());
  }
  return lines;
}

/** The record read back as a card; a record without one reads as blank. */
export function citizenFromMarkdown(markdown: string): CitizenProfile {
  const { head } = splitAtNotes(markdown);
  const photo = sectionLines(head, 'Portrait')
    .map((line) => IMAGE_LINE_RE.exec(line)?.[1])
    .find((source) => source !== undefined);
  const rows = new Map<string, string>();
  for (const line of sectionLines(head, 'Citizen')) {
    const match = ROW_RE.exec(line);
    if (match) rows.set(match[1] as string, match[2] as string);
  }
  return cleanCitizen({
    photo,
    name: rows.get('name'),
    line: rows.get('line'),
    place: rows.get('place'),
    links: [rows.get('link1'), rows.get('link2'), rows.get('link3')],
  });
}

/**
 * The record with its card replaced and everything else kept as it was —
 * what Resumen writes, since it changes the card and never the sheet. The
 * card goes before `## Notes`; a record left with nothing in it reads ''
 * (the caller then removes the key).
 */
export function withCitizen(markdown: string, citizen: CitizenProfile): string {
  const { head, notes } = splitAtNotes(markdown);
  const kept: string[] = [];
  let skipping = false;
  for (const line of head.split('\n')) {
    if (line.startsWith('## ')) {
      skipping = (CARD_SECTIONS as readonly string[]).includes(line.slice(3).trim());
    }
    if (!skipping) kept.push(line);
  }
  const parts = [kept.join('\n'), citizenToMarkdown(citizen), notes]
    .map((part) => part.replace(/\s+$/, ''))
    .filter((part) => part !== '');
  return parts.length === 0 ? '' : `${parts.join('\n\n')}\n`;
}
