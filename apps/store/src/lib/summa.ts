/**
 * Summa entity cards (experiment, 2026-09-20).
 *
 * The archive (numengames/numinia-archive) registers things that are not
 * documents in objects/: one Markdown card per entity — entity → forms →
 * copies. A form is how the thing manifests (a model, a portrait), with its
 * own licence and rights holder; a copy is where the bytes are, with sha256
 * and size. The card is an index, never a copy. The archive generates
 * objects/catalogue.json from the cards (scripts/entities.mjs there).
 *
 * This site reads that catalogue and each card's body at build, through
 * the same two-source pattern as the lore: scripts/fetch-summa.mjs writes
 * the real files into the gitignored apps/store/.lore/summa/ on a deploy;
 * hermetic/CI builds (DATA_SOURCE=fixture) use the committed snapshot in
 * fixtures/summa/. Both are bundle-embedded — Workers have no node:fs.
 *
 * The legacy asset model is NOT changed: where a legacy id has a card, the
 * detail page shows the card BESIDE the legacy record, and the index card
 * gets a discreet mark. Where it has none, nothing differs.
 */

export interface SummaCopy {
  readonly url?: string;
  readonly repo?: string;
  readonly path?: string;
  readonly commit?: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly note?: string;
}

export interface SummaForm {
  readonly role: string;
  readonly format: string;
  readonly version?: string;
  readonly license: string;
  readonly rights_holder: string;
  readonly embedded_license?: string;
  readonly copies: readonly SummaCopy[];
}

export interface SummaCard {
  readonly slug: string;
  readonly path: string;
  readonly id: string;
  readonly title: string;
  readonly entity: string;
  readonly status: string;
  readonly version: string;
  readonly license: string;
  readonly created?: string;
  readonly updated?: string;
  readonly related: readonly string[];
  readonly forms: readonly SummaForm[];
}

export interface SummaCatalogue {
  readonly entities: readonly SummaCard[];
}

export interface CardSection {
  readonly title: string;
  readonly html: string;
}

/** The archive that owns the cards; the page links each card back to it. */
export const SUMMA_SITE = 'https://numinia.org';
export const DEPOT_REPO = 'numengames/numinia-assets';

const realCatalogue = import.meta.glob('../../.lore/summa/catalogue.json', {
  import: 'default',
  eager: true,
}) as Record<string, SummaCatalogue>;
const fixtureCatalogue = import.meta.glob('../../fixtures/summa/catalogue.json', {
  import: 'default',
  eager: true,
}) as Record<string, SummaCatalogue>;
const realCards = import.meta.glob('../../.lore/summa/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const fixtureCards = import.meta.glob('../../fixtures/summa/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const useFixture = (): boolean => process.env.DATA_SOURCE === 'fixture';

let summaPromise: Promise<SummaCatalogue> | null = null;

/** The catalogue, loaded once per build. */
export function loadSumma(): Promise<SummaCatalogue> {
  summaPromise ??= Promise.resolve(
    (useFixture() ? undefined : Object.values(realCatalogue)[0]) ??
      Object.values(fixtureCatalogue)[0] ?? { entities: [] },
  );
  return summaPromise;
}

/** The card whose `id` is a legacy asset id, or undefined. */
export function findCard(summa: SummaCatalogue, assetId: string): SummaCard | undefined {
  return summa.entities.find((card) => card.id === assetId);
}

/**
 * The URL the download button uses: the copy that lives in the depot,
 * pinned to its commit — the copy the card declares and the archive's check
 * hashed. Any other copy is a fallback; no copy is null.
 */
export function depotDownloadUrl(card: SummaCard): string | null {
  const copies = card.forms.flatMap((form) => form.copies);
  const depot = copies.find((copy) => copy.repo === DEPOT_REPO && copy.url);
  const first = copies.find((copy) => copy.url);
  return depot?.url ?? first?.url ?? null;
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function inline(text: string): string {
  let html = escapeHtml(text);
  html = html.replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replaceAll(/(^|[^\w*])\*(?!\*)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  html = html.replaceAll(/(^|[^\w_])_([^_\n]+?)_(?!\w)/g, '$1<em>$2</em>');
  html = html.replaceAll(/`([^`]+?)`/g, '<code>$1</code>');
  return html;
}

/**
 * A card's Markdown body → its H2 sections as safe HTML. The header, the
 * H1 and the blockquote lede (Summary / Epistemic / Pragmatic / Audience —
 * the archive's own reading aid) are dropped; paragraphs are blank-line
 * groups; only bold, italics and code survive as markup.
 */
export function parseCardBody(markdown: string): readonly CardSection[] {
  const withoutHeader = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
  const sections: { title: string; lines: string[] }[] = [];
  for (const raw of withoutHeader.split('\n')) {
    const h2 = /^## (.+?)\s*$/.exec(raw);
    if (h2) {
      sections.push({ title: h2[1] as string, lines: [] });
      continue;
    }
    const current = sections.at(-1);
    if (!current) continue;
    current.lines.push(raw);
  }
  return sections.map(({ title, lines }) => {
    const paragraphs = lines
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p !== '' && !p.startsWith('>') && p !== '---');
    return { title, html: paragraphs.map((p) => `<p>${inline(p.replaceAll('\n', ' '))}</p>`).join('') };
  });
}

/** The body sections of the card with this slug, or null when no body is shipped. */
export async function cardBody(slug: string): Promise<readonly CardSection[] | null> {
  const pick = (files: Record<string, string>): string | undefined =>
    Object.entries(files).find(([path]) => path.endsWith(`/${slug}.md`))?.[1];
  const md = (useFixture() ? undefined : pick(realCards)) ?? pick(fixtureCards);
  return md === undefined ? null : parseCardBody(md);
}
