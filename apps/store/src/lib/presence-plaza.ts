/**
 * «La plaza» (MIS-266): who is online, away, do-not-disturb or offline.
 * Pure and clocked from outside, so the tests move time by hand.
 *
 * STD-053: PRS-001 away after 10 minutes without a touch, offline after 2
 * minutes without a beat; PRS-002 invisible reads as offline to everybody
 * else; PRS-003 until the person answers the first-time question
 * (`choose`) they read as offline; PRS-005 no history and no «last seen»:
 * a beat record is only the last beat and the last touch, and `sweep`
 * drops it once it can no longer matter. What the person chose stays — it
 * is a setting, not a trace.
 *
 * The same shape sits behind a Durable Object later (every method may be
 * awaited); nothing here reads a wallet as anything but a key.
 */

/** What a person picks (PRS-001); «offline» is only ever computed. */
export type Choice = 'online' | 'away' | 'dnd' | 'invisible';
/** What the others read. */
export type Seen = 'online' | 'away' | 'dnd' | 'offline';

/** A page beats this often while it is in view. */
export const BEAT_EVERY_MS = 60_000;
/** No beat for this long: offline. */
export const OFFLINE_AFTER_MS = 2 * 60_000;
/** No touch for this long: away. */
export const AWAY_AFTER_MS = 10 * 60_000;

export const CHOICES: readonly Choice[] = ['online', 'away', 'dnd', 'invisible'];

export interface Plaza {
  /** A page says «still here»; `active` is whether the person touched something since the last beat. */
  beat(person: string, active: boolean): void;
  /** The person's answer: what they chose to show. */
  choose(person: string, choice: Choice): void;
  /** The state each person shows to the others. */
  states(people: readonly string[]): Record<string, Seen>;
  /** Forget the beats that no longer count. */
  sweep(): void;
  /** How many beat records are held. */
  size(): number;
}

interface Pulse {
  beatAt: number;
  touchAt: number;
}

export function createPlaza(now: () => number): Plaza {
  const pulses = new Map<string, Pulse>();
  const choices = new Map<string, Choice>();

  const seen = (person: string, at: number): Seen => {
    const choice = choices.get(person);
    const pulse = pulses.get(person);
    if (choice === undefined || choice === 'invisible') return 'offline';
    if (pulse === undefined || at - pulse.beatAt >= OFFLINE_AFTER_MS) return 'offline';
    if (choice === 'away' || choice === 'dnd') return choice;
    return at - pulse.touchAt >= AWAY_AFTER_MS ? 'away' : 'online';
  };

  return {
    beat(person, active) {
      const at = now();
      const held = pulses.get(person);
      // A person coming back after silence starts fresh: a first beat counts as a touch.
      const fresh = held === undefined || at - held.beatAt >= OFFLINE_AFTER_MS;
      pulses.set(person, { beatAt: at, touchAt: fresh || active ? at : held.touchAt });
    },
    choose(person, choice) {
      choices.set(person, choice);
    },
    states(people) {
      const at = now();
      return Object.fromEntries(people.map((person) => [person, seen(person, at)]));
    },
    sweep() {
      const at = now();
      for (const [person, pulse] of pulses) {
        if (at - pulse.beatAt >= OFFLINE_AFTER_MS) pulses.delete(person);
      }
    },
    size: () => pulses.size,
  };
}
