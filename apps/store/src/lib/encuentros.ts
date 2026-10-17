/**
 * «Encuentros» (/calendar/), the list view: the encounters of the whole city
 * grouped by the month each one starts, months and rows in date order. The
 * month grid stays in lib/communities.ts (`calendarMonths`); this module only
 * adds what the list needs. Dates are read in UTC, as the register writes them.
 */

import { byStart, ritualStartMs, type Ritual } from './communities';

export interface MonthGroup {
  /** YYYY-MM, stable for keys and anchors. */
  readonly key: string;
  /** «Octubre de 2026» / «October 2026». */
  readonly label: string;
  readonly rituals: readonly Ritual[];
}

/** The register's content is written in Spanish and English; the rest read English. */
function contentTag(locale: string): string {
  return locale === 'es' ? 'es-ES' : 'en-GB';
}

/** The encounters by the month they start, the nearest month first. */
export function byMonth(rituals: readonly Ritual[], locale: string): readonly MonthGroup[] {
  const label = new Intl.DateTimeFormat(contentTag(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const groups = new Map<string, { label: string; rituals: Ritual[] }>();
  for (const ritual of [...rituals].sort(byStart)) {
    const start = new Date(ritualStartMs(ritual));
    const key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const group = groups.get(key);
    if (group) group.rituals.push(ritual);
    else {
      const name = label.format(start);
      groups.set(key, { label: name.charAt(0).toUpperCase() + name.slice(1), rituals: [ritual] });
    }
  }
  return [...groups].map(([key, group]) => ({ key, label: group.label, rituals: group.rituals }));
}
