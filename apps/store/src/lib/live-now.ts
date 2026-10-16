/**
 * «Ahora en la ciudad» (v3, the city's rail): how many people are inside
 * each world right now, read from /api/live's answer — numbers only, never
 * names. Pure: the rail's script hands the answer in and paints what comes
 * out. A world that does not answer, or answers nobody, is left out: the
 * rail shows nothing rather than an empty or invented count.
 */

/** The worlds with someone inside, by community id, from /api/live's body. */
export function peopleInside(body: unknown): Readonly<Record<string, number>> {
  if (typeof body !== 'object' || body === null) return {};
  const inside = (body as Record<string, unknown>)['inside'];
  if (typeof inside !== 'object' || inside === null) return {};
  return Object.fromEntries(
    Object.entries(inside).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isInteger(entry[1]) && entry[1] > 0,
    ),
  );
}

/** «1 persona dentro ahora» / «{n} personas dentro ahora», from the page's own words. */
export function insideLine(
  n: number,
  words: { readonly one: string; readonly many: string },
): string {
  return n === 1 ? words.one : words.many.replace('{n}', String(n));
}

/** Everyone inside, all worlds together (the live dot's figure). */
export function totalInside(counts: Readonly<Record<string, number>>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
