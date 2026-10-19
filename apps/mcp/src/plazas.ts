/**
 * Plazas — an organization's seats for its AIs' bodies in worlds and the
 * clock of how long they were inside (DISENO-MCP-REMOTO §2 (e), story W8).
 * One Durable Object per organization (`PLAZAS.getByName(<organization>)`),
 * asked only by the bodies (cuerpo.ts), never by a client.
 *
 * Seats. At most {@link MAX_BODIES} bodies of one organization are inside a
 * world at once. A seat is a lease, not a flag: the body renews it every
 * minute ({@link Plazas.beat}) and it lapses {@link SEAT_LEASE_MS} after the
 * last renewal, so a body that vanished without saying so (its Durable
 * Object evicted, a crash) frees its seat by itself within three minutes.
 * One Durable Object is one thread: two bodies asking at once are answered
 * one after the other, so the cap cannot be overrun by a race.
 *
 * Body time. The house pays the bodies for now (Pablo, P1); to bill each
 * organization later the time is COUNTED here, per UTC day and per agent,
 * in this object's own storage (`day:YYYY-MM-DD`, milliseconds; an interval
 * that crosses midnight is split). No till migration: whoever bills later
 * reads {@link Plazas.days} for each organization the till already knows.
 */
import { DurableObject } from 'cloudflare:workers';
import type { Env } from './env';

/** Bodies of one organization inside worlds at once. */
export const MAX_BODIES = 3;

/** A seat lapses this long after its last renewal (a body renews it every minute). */
export const SEAT_LEASE_MS = 3 * 60_000;

const DAY_MS = 24 * 60 * 60_000;
const SEATS_KEY = 'seats';
const DAY_PREFIX = 'day:';

/** Who holds a seat, and until when (ms since epoch). */
type Seats = Record<string, number>;

/** One UTC day of an organization's body time, as stored. */
interface DayRecord {
  ms: number;
  agents: Record<string, number>;
}

/** One UTC day of body time, as billing will read it. */
export interface BodyDay {
  /** `YYYY-MM-DD`, UTC. */
  readonly day: string;
  /** Body-seconds of the whole organization that day. */
  readonly seconds: number;
  /** Body-seconds per agent that day. */
  readonly agents: Readonly<Record<string, number>>;
}

/** Whether the seat is the agent's now, and how many seats are taken after asking. */
export interface SeatAnswer {
  readonly ok: boolean;
  readonly taken: number;
}

/** The UTC days the interval [from, to) touches, with its milliseconds in each. */
export function splitByDay(from: number, to: number): [string, number][] {
  const parts: [string, number][] = [];
  let at = from;
  while (at < to) {
    const next = Math.min(to, (Math.floor(at / DAY_MS) + 1) * DAY_MS);
    parts.push([new Date(at).toISOString().slice(0, 10), next - at]);
    at = next;
  }
  return parts;
}

const toSeconds = (ms: number): number => Math.round(ms / 1000);

export class Plazas extends DurableObject<Env> {
  /** Take the agent's seat, or keep it if it holds one; refused when the others hold all of them. */
  async take(agent: string): Promise<SeatAnswer> {
    const now = Date.now();
    const seats = await this.live(now);
    if (!(agent in seats) && Object.keys(seats).length >= MAX_BODIES) {
      return { ok: false, taken: Object.keys(seats).length };
    }
    seats[agent] = now + SEAT_LEASE_MS;
    await this.ctx.storage.put(SEATS_KEY, seats);
    return { ok: true, taken: Object.keys(seats).length };
  }

  /**
   * Every minute a body is inside: count [from, to) and renew its seat.
   * false when its seat lapsed and others took all of them: it must leave.
   */
  async beat(agent: string, from: number, to: number): Promise<boolean> {
    await this.count(agent, from, to);
    return (await this.take(agent)).ok;
  }

  /** A body left: count its last stretch [from, to) and free its seat. */
  async release(agent: string, from: number, to: number): Promise<void> {
    await this.count(agent, from, to);
    const seats = await this.live(Date.now());
    delete seats[agent];
    await this.ctx.storage.put(SEATS_KEY, seats);
  }

  /** The agents holding a seat now. */
  async holders(): Promise<string[]> {
    return Object.keys(await this.live(Date.now())).sort();
  }

  /** Body time per UTC day, oldest first: what billing will read. */
  async days(): Promise<BodyDay[]> {
    const stored = await this.ctx.storage.list<DayRecord>({ prefix: DAY_PREFIX });
    return [...stored]
      .map(([key, record]) => ({
        day: key.slice(DAY_PREFIX.length),
        seconds: toSeconds(record.ms),
        agents: Object.fromEntries(
          Object.entries(record.agents).map(([agent, ms]) => [agent, toSeconds(ms)]),
        ),
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }

  /** The seats whose lease has not lapsed. */
  private async live(now: number): Promise<Seats> {
    const seats = (await this.ctx.storage.get<Seats>(SEATS_KEY)) ?? {};
    return Object.fromEntries(Object.entries(seats).filter(([, until]) => until > now));
  }

  private async count(agent: string, from: number, to: number): Promise<void> {
    for (const [day, ms] of splitByDay(from, to)) {
      const key = `${DAY_PREFIX}${day}`;
      const record = (await this.ctx.storage.get<DayRecord>(key)) ?? { ms: 0, agents: {} };
      record.ms += ms;
      record.agents[agent] = (record.agents[agent] ?? 0) + ms;
      await this.ctx.storage.put(key, record);
    }
  }
}
