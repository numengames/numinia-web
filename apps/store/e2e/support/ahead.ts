/**
 * The encounters of the register that are still ahead RIGHT NOW.
 *
 * A spec that needs «an encounter still to come» must not name one by id:
 * the register's encounters have fixed dates, so a name that was ahead on the
 * day the spec was written is over a few weeks later and the spec goes red on
 * every branch at once (it happened on 2026-10-24 with TRG26). This reads the
 * real files and applies the app's own rule (lib/agenda.ts `isPast`): over
 * once it is marked held, or once its last instant is behind now.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface AheadRitual {
  readonly id: string;
  readonly title: string;
  readonly startMs: number;
}

const DAY_MS = 86_400_000;
const DIR = fileURLToPath(new URL('../../src/content/communities/rituals/', import.meta.url));

/** A top-level scalar of the front matter, unquoted; `undefined` when absent. */
function scalar(front: string, key: string): string | undefined {
  const line = front.match(new RegExp(`^${key}:[ \\t]*(.+)$`, 'm'));
  return line?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2');
}

/** Encounters not yet held and not yet over, the nearest first. */
export function aheadRituals(now: Date = new Date()): readonly AheadRitual[] {
  const found: AheadRitual[] = [];
  for (const file of readdirSync(DIR).filter((name) => name.endsWith('.md'))) {
    const front = readFileSync(DIR + file, 'utf8').split(/^---\s*$/m)[1] ?? '';
    const start = scalar(front, 'start');
    const title = scalar(front, 'title');
    if (start === undefined || title === undefined) continue;
    const end = scalar(front, 'end') ?? start;
    const allDay = /^\d{4}-\d{2}-\d{2}$/.test(start);
    const startMs = allDay ? Date.parse(`${start}T00:00:00Z`) : Date.parse(start);
    const endMs = allDay ? Date.parse(`${end}T00:00:00Z`) + DAY_MS : Date.parse(end);
    if (scalar(front, 'status') === 'held' || endMs < now.getTime()) continue;
    found.push({ id: file.replace(/\.md$/, ''), title, startMs });
  }
  return found.sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
}
