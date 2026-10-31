/**
 * The pure half of the reading player (components/speech/SpeechPlayer.astro,
 * ported from numinia.org's MIS-119 player): where a position in the spoken
 * text falls, where a seek may land, what the clock and the section label
 * beside the ruler say, and the queue the engine speaks. No DOM, no engine —
 * arithmetic on the string the player speaks, so it is tested as that.
 */

/** The player's words, handed in by the host in its own language. */
export interface SpeechStrings {
  readonly listen: string;
  readonly pause: string;
  readonly resume: string;
  readonly stop: string;
  readonly listenAria: string;
  readonly pauseAria: string;
  readonly resumeAria: string;
  readonly noEngine: string;
  readonly nothing: string;
  /** With a `{rate}` slot. */
  readonly rateAria: string;
  readonly min: string;
  readonly player: string;
  readonly position: string;
  /** With `{at}` and `{total}` slots. */
  readonly positionText: string;
  readonly back: string;
  readonly reading: string;
  readonly paused: string;
  readonly stopped: string;
}

/** Sentence-ending marks. A seek never starts the voice after anything else. */
const TERMINAL = /[.!?…]/;
/** What may close a sentence after its mark: «…», “…”, (…). */
const CLOSER = /[»"”’)\]]/;

/** Does a sentence end at `j` (a mark, or a closer right after one)? */
function endsAt(text: string, j: number): boolean {
  const c = text.charAt(j);
  return TERMINAL.test(c) || (CLOSER.test(c) && TERMINAL.test(text.charAt(j - 1)));
}

/**
 * The start of the sentence that holds `at`. A drop on the ruler goes here:
 * the voice starts at the head of a sentence, never mid-word or mid-clause.
 * Out-of-range positions are clamped, not thrown — a ruler can report -1 or
 * length+1 on a fast drag.
 */
export function sentenceStart(text: string, at: number): number {
  if (!text) return 0;
  let i = Math.max(0, Math.min(Math.floor(at), text.length - 1));
  // A position on the space after a mark belongs to the sentence that mark
  // closed; step back over whitespace first.
  while (i > 0 && text[i] === ' ') i--;
  // The sentence begins after the nearest mark before `i` that is followed
  // by a space (so "3.5" or "e.g" mid-word does not split a sentence).
  for (let j = i - 1; j >= 0; j--) {
    if (endsAt(text, j) && text[j + 1] === ' ') {
      let s = j + 1;
      while (text[s] === ' ') s++;
      return s;
    }
  }
  return 0;
}

/** Which chunk of the engine's queue holds `at`, and how far into it. */
export function locate(
  chunkStarts: readonly number[],
  at: number,
): { index: number; offset: number } {
  let index = 0;
  for (let k = 0; k < chunkStarts.length; k++) {
    if ((chunkStarts[k] as number) <= at) index = k;
    else break;
  }
  return { index, offset: Math.max(0, at - (chunkStarts[index] ?? 0)) };
}

/** m:ss, rounded to the second; never negative. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Baseline speaking pace for every estimate the player shows. */
export const WPM = 180;

/** Seconds a document of `words` takes at `rate`. */
export function duration(words: number, rate: number): number {
  return (words / (WPM * rate)) * 60;
}

export interface Section {
  at: number;
  title: string;
}

/** The last section starting at or before `at` — what the dock names. */
export function sectionAt(
  sections: readonly Section[],
  at: number,
): { index: number; at: number; title: string } {
  let index = -1;
  for (let k = 0; k < sections.length; k++) {
    if ((sections[k] as Section).at <= at || index < 0) index = k;
    else break;
  }
  const found = sections[index];
  return found ? { index, at: found.at, title: found.title } : { index: 0, at: 0, title: '' };
}

/** Longest utterance: engines cut long ones (Chrome at ~15 s). */
const MAX_UTTERANCE = 220;

/**
 * The queue the engine speaks: one sentence per utterance. Each utterance's
 * end is an exact, engine-reported moment, so the reading light re-syncs at
 * every sentence and an estimate can never drift more than one sentence.
 * A sentence longer than an engine will hold is cut at a comma, else a
 * space — never mid-word. Joined with single spaces, the parts are the text.
 */
export function sentences(text: string): string[] {
  // A sentence ends at a run of marks (and any closing quote or bracket)
  // followed by a space or the end, so a mark inside a word ("3.5",
  // "v0.6.0") never splits one, and «…contenido.» Este… does. (numinia.org's
  // original regex dropped the text before such a mark: "Version 3.5 ships."
  // came out as ".", "5 ships." — fixed here.)
  const merged: string[] = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?…]+[»"”’)\]]*(?=\s|$)/g)) {
    const end = m.index + m[0].length;
    const s = text.slice(start, end).trim();
    if (s) merged.push(s);
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail) merged.push(tail);
  const out: string[] = [];
  for (const s of merged) {
    let rest = s;
    while (rest.length > MAX_UTTERANCE) {
      const head = rest.slice(0, MAX_UTTERANCE);
      let cut = head.lastIndexOf(', ');
      if (cut < MAX_UTTERANCE / 3) cut = head.lastIndexOf(' ');
      else cut += 1; // keep the comma with its clause
      if (cut <= 0) cut = MAX_UTTERANCE;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/** Spoken length of one digit, in letters: "seven", "twenty" ≈ 5–6. */
const DIGIT = 5.5;

/**
 * How long a token takes to SAY, in letters of ordinary speech. A word
 * weighs its length; digits weigh what they are read out as ("1920" →
 * "nineteen twenty"), and a separator inside a number is a word of its own
 * ("point", "of"). This is what kept the light behind the voice on figures
 * and dates: they were counted as they are written.
 */
export function spokenWeight(token: string): number {
  let w = 0;
  for (let i = 0; i < token.length; i++) {
    const c = token.charAt(i);
    if (c >= '0' && c <= '9') w += DIGIT;
    else if (/[-/.:,]/.test(c) && /\d/.test(token.charAt(i - 1)) && /\d/.test(token.charAt(i + 1)))
      w += 4;
    else w += 1;
  }
  return w;
}

/**
 * The character the voice has reached after `units` letters of speech
 * inside `sentence` — the estimate for engines that report no word
 * boundaries. Walks token by token by spoken weight; clamps to the end.
 */
export function charAtSpoken(sentence: string, units: number): number {
  let spent = 0;
  let i = 0;
  while (i < sentence.length) {
    let e = sentence.indexOf(' ', i);
    if (e < 0) e = sentence.length;
    const w = spokenWeight(sentence.slice(i, e)) + 1; // + the pause of the space
    if (spent + w > units) {
      const f = Math.max(0, units - spent) / w;
      return Math.min(e, i + Math.floor(f * (e - i)));
    }
    spent += w;
    i = e + 1;
  }
  return sentence.length;
}

/**
 * Speeds, in the order one button steps through them. From 1× the first
 * step is the gentle one (1.25); 1.75 is left out (nobody tells it from 2
 * and it is one more press); 0.75 closes the loop for whoever needs slower
 * (learning the language, reading difficulty).
 */
export const RATES = [1, 1.25, 1.5, 2, 0.75] as const;

export function nextRate(rate: number): number {
  const i = (RATES as readonly number[]).indexOf(rate);
  return i < 0 ? 1 : (RATES[(i + 1) % RATES.length] as number);
}

/** A stored speed, read back: anything not on the dial is 1×. */
export function parseRate(raw: string | null): number {
  const r = Number(raw);
  return (RATES as readonly number[]).includes(r) ? r : 1;
}

/** Where each chunk starts in `text` — the bridge from an utterance back to the document. */
export function chunkStarts(text: string, chunks: readonly string[]): number[] {
  const out: number[] = [];
  let cursor = 0;
  for (const c of chunks) {
    const at = text.indexOf(c, cursor);
    const start = at < 0 ? cursor : at;
    out.push(start);
    cursor = start + c.length;
  }
  return out;
}

/** The estimate shown on the Listen button: "· <1 min" or "· ~N min". */
export function estimate(words: number, rate: number, min: string): string {
  const mins = duration(words, rate) / 60;
  return mins < 1 ? `· <1 ${min}` : `· ~${Math.round(mins)} ${min}`;
}

/**
 * The Listen button's accessible name. WCAG 2.5.3 (axe
 * `label-content-name-mismatch`): the name must contain the words the button
 * SHOWS — the label and, when it is drawn, the estimate — in that order, so a
 * voice-control user who says what they read hits it. When the phrase already
 * opens with the label («Escuchar» → «Escuchar este capítulo») the rest of it
 * follows the shown words instead of repeating them.
 */
export function toggleName(label: string, est: string, phrase: string): string {
  if (est === '') return phrase.startsWith(label) ? phrase : `${label}, ${phrase}`;
  const shown = `${label} ${est}`;
  return phrase.startsWith(`${label} `)
    ? shown + phrase.slice(label.length)
    : `${shown}, ${phrase}`;
}

export interface SavedPosition {
  index: number;
  offset: number;
}

/**
 * A saved place, read back from session storage. It only counts when the
 * fingerprint (the number of chunks) still matches: if a deploy re-chunks
 * the text, the stale index is discarded instead of resuming mid-nonsense.
 * Returns null for nothing to resume, 'stale' for an entry to clear.
 */
export function restorePosition(
  raw: string | null,
  chunks: readonly string[],
): SavedPosition | 'stale' | null {
  let saved: unknown;
  try {
    saved = JSON.parse(raw ?? 'null');
  } catch {
    return null;
  }
  if (typeof saved !== 'object' || saved === null) return null;
  const { i, o, n } = saved as { i?: unknown; o?: unknown; n?: unknown };
  if (n !== chunks.length || !Number.isInteger(i)) return 'stale';
  const index = i as number;
  const offset = Number.isInteger(o) ? (o as number) : 0;
  if (index < 0 || index >= chunks.length || (index === 0 && offset <= 0)) return 'stale';
  const length = (chunks[index] as string).length;
  return { index, offset: offset > 0 && offset < length ? offset : 0 };
}
