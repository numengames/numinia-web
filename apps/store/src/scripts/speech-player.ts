/**
 * The reading player (components/speech/SpeechPlayer.astro), ported from
 * numinia.org (MIS-119, the dock and the ruler of 2026-09-24): it speaks the
 * rendered text through the browser's own synthesis (Web Speech API), so the
 * text never leaves the reader's machine.
 *
 * - The text is split on sentence boundaries and queued utterance by
 *   utterance (engines cut a long utterance at ~15 s). cancel() fires the
 *   cancelled utterance's end/error events late, so every cancel bumps a
 *   generation counter and callbacks from an older generation are no-ops.
 * - The page follows the voice until the reader scrolls; then a "Back to the
 *   reading" button appears above the dock, pointing where the voice is.
 * - The dock surfaces at the bottom while the voice is on: play/pause, the
 *   section and the clock, a print ruler (a mark per section; hover previews
 *   the sentence a drop would start; arrows step by sentence), the speed and
 *   stop.
 * - What has been read dries like ink (CSS Custom Highlight API — no DOM is
 *   touched), and a diffuse light glides above the word being spoken.
 * - A tap on a sentence while the player is on starts the voice there.
 * - Pause is ours, not the engine's (engine pause/resume is unreliable), and
 *   the place survives navigation in session storage.
 *
 * Pure arithmetic lives in lib/speech-position.ts (tested there).
 */

import {
  WPM,
  charAtSpoken,
  chunkStarts,
  clock,
  duration,
  estimate,
  locate,
  nextRate,
  parseRate,
  restorePosition,
  sectionAt,
  sentenceStart,
  sentences,
  spokenWeight,
  toggleName,
  type Section,
} from '../lib/speech-position';

/** The chosen speed follows the reader from chapter to chapter. */
const RATE_KEY = 'numinia-codex-ritmo';
/** Prefix of the session-only place, one per page: `<prefix>:<path>`. */
const POSITION_KEY = 'numinia-codex-escucha';

/** Test seam: e2e injects a deterministic engine here — replacing the real
 * `window.speechSynthesis` is not writable in every engine. */
interface SynthWindow {
  __speechSynth?: SpeechSynthesis;
}

type State = 'idle' | 'speaking' | 'paused';

interface DocMap {
  text: string;
  nodes: Text[];
  nodeIdx: Int32Array;
  nodeOff: Int32Array;
  /** First and last character of `text` each node holds. */
  nodeFirst: number[];
  nodeLast: number[];
  sections: Section[];
}

const EMPTY_MAP: DocMap = {
  text: '',
  nodes: [],
  nodeIdx: new Int32Array(0),
  nodeOff: new Int32Array(0),
  nodeFirst: [],
  nodeLast: [],
  sections: [],
};

const PRUNE = ['nav', '.speech-player', '.sp-dock', '.margen'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'SVG']);

function q<T extends Element>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`speech-player: missing ${selector}`);
  return el;
}

function initPlayer(root: HTMLElement): void {
  // UI strings come pre-translated from the server as data-t-* attributes.
  const T = (key: string, fallback: string): string => root.dataset['t' + key] ?? fallback;
  const toggle = q<HTMLButtonElement>(root, '.sp-toggle');
  const label = q<HTMLElement>(root, '.sp-label');
  const icon = q<HTMLElement>(root, '.sp-icon');
  const est = q<HTMLElement>(root, '.sp-est');
  const dock = q<HTMLElement>(root, '.sp-dock');
  const playBtn = q<HTMLButtonElement>(dock, '.sp-play');
  const stopBtn = q<HTMLButtonElement>(dock, '.sp-stop');
  const rateBtn = q<HTMLButtonElement>(dock, '.sp-rate');
  const backBtn = q<HTMLButtonElement>(dock, '.sp-back');
  const secEl = q<HTMLElement>(dock, '.sp-sec');
  const timeEl = q<HTMLElement>(dock, '.sp-time');
  const ruler = q<HTMLElement>(dock, '.sp-ruler');
  const ticks = q<SVGSVGElement>(dock, '.sp-ticks');
  const peek = q<HTMLElement>(dock, '.sp-peek');
  const peekWhen = q<HTMLElement>(peek, 'b');
  const peekText = q<HTMLElement>(peek, 'span');
  const live = q<HTMLElement>(root, '.sp-live');

  const seam = (window as SynthWindow).__speechSynth;
  if (!seam && !('speechSynthesis' in window)) {
    toggle.hidden = true;
    dock.remove();
    return;
  }
  const synth: SpeechSynthesis = seam ?? window.speechSynthesis;

  // ---- text extraction -------------------------------------------------
  // Extracted from the LIVE DOM, and re-extracted on every Play: a reader
  // who runs the browser's own translation gets a page whose text nodes
  // were replaced in place, and whatever is on screen is what gets spoken.
  // The walker keeps, for every character of the spoken text, which Text
  // node it came from and at what offset — what lets the light sit above
  // the word and the read text dry behind it. It also records where each
  // heading starts: the sections the dock names and the ruler marks.
  const selector = root.dataset.textSelector ?? 'article';
  const target = document.querySelector<HTMLElement>(selector);
  const pageTitle = (): string =>
    root.dataset.title ?? (document.querySelector('h1')?.textContent ?? '').trim();
  const mapDocument = (): DocMap => {
    if (!target) return EMPTY_MAP;
    const nodes: Text[] = [];
    const idx: number[] = [];
    const off: number[] = [];
    const sections: Section[] = [{ at: 0, title: pageTitle() }];
    let out = '';
    let pendingSpace = false;
    const walk = (el: Element): void => {
      if (SKIP_TAGS.has(el.tagName)) return;
      if (PRUNE.some((s) => el.matches(s))) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const block = !cs.display.startsWith('inline');
      if (block) pendingSpace = true;
      if (/^H[2-4]$/.test(el.tagName)) {
        const title = (el.textContent ?? '').trim();
        const at = out.length ? out.length + 1 : 0;
        // A heading that opens the document renames the first section.
        if (title) {
          if (at === 0) sections[0] = { at: 0, title };
          else sections.push({ at, title });
        }
      }
      for (const c of Array.from(el.childNodes)) {
        if (c.nodeType === Node.ELEMENT_NODE) {
          walk(c as Element);
          continue;
        }
        if (c.nodeType !== Node.TEXT_NODE) continue;
        const tn = c as Text;
        const s = tn.data;
        let ni = -1;
        for (let i = 0; i < s.length; i++) {
          const ch = s.charAt(i);
          if (/\s/.test(ch)) {
            pendingSpace = true;
            continue;
          }
          if (pendingSpace && out.length) {
            out += ' ';
            idx.push(-1);
            off.push(0);
          }
          pendingSpace = false;
          if (ni < 0) ni = nodes.push(tn) - 1;
          out += ch;
          idx.push(ni);
          off.push(i);
        }
      }
      if (block) pendingSpace = true;
    };
    walk(target);
    const nodeFirst: number[] = new Array<number>(nodes.length).fill(-1);
    const nodeLast: number[] = new Array<number>(nodes.length).fill(-1);
    for (let i = 0; i < idx.length; i++) {
      const n = idx[i] as number;
      if (n < 0) continue;
      if ((nodeFirst[n] as number) < 0) nodeFirst[n] = i;
      nodeLast[n] = i;
    }
    return {
      text: out,
      nodes,
      nodeIdx: Int32Array.from(idx),
      nodeOff: Int32Array.from(off),
      nodeFirst,
      nodeLast,
      sections,
    };
  };
  let docMap = mapDocument();
  const readDocument = (): string => mapDocument().text;
  let text = docMap.text;
  let words = text ? text.split(' ').length : 0;
  if (!words) {
    // A cover, an index or a veiled chapter: nothing to read, no button.
    toggle.hidden = true;
    dock.remove();
    return;
  }
  // The dock is position: fixed, but an ancestor with a transform or a
  // filter would trap it; it belongs to the body.
  document.body.appendChild(dock);

  // ---- the queue: one sentence per utterance ----------------------------
  let chunks: string[] = sentences(text);
  let chunkAt: number[] = chunkStarts(text, chunks);
  const chunk = (i: number): string => chunks[i] ?? '';

  // ---- voice pick (async: engines populate voices late) ----------------
  // The manual's own voice (data-lang) unless the browser's translation
  // rewrote <html lang> since the build — then the language on screen.
  const builtLang = root.dataset.htmlLang ?? document.documentElement.lang;
  const liveLang = (): string => {
    const now = document.documentElement.lang;
    return (now && now !== builtLang ? now : (root.dataset.lang ?? now ?? 'en')).toLowerCase();
  };
  let docLang = liveLang();
  let voice: SpeechSynthesisVoice | null = null;
  // LAZY on purpose: the platform voice stack is not touched until the
  // reader asks for it — some engines misbehave on mere contact.
  let warmed = false;
  const pickVoice = (): void => {
    const vs = synth.getVoices();
    voice =
      vs.find((v) => v.lang.toLowerCase() === docLang) ??
      vs.find((v) => v.lang.toLowerCase().startsWith(docLang.slice(0, 2))) ??
      null; // the engine default is an acceptable fallback
  };
  const warm = (): void => {
    if (warmed) return;
    warmed = true;
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  };

  // ---- estimate --------------------------------------------------------
  let rate = 1;
  try {
    rate = parseRate(localStorage.getItem(RATE_KEY));
  } catch {
    /* storage denied: 1× */
  }
  const storeRate = (r: number): void => {
    try {
      localStorage.setItem(RATE_KEY, String(r));
    } catch {
      /* private mode: the speed lives for this page only */
    }
  };
  // The toggle's accessible name carries the words it shows (WCAG 2.5.3), the
  // estimate included: whoever changes either re-names it.
  let togglePhrase = T('ListenAria', 'Listen to this chapter');
  const nameToggle = (): void => {
    toggle.setAttribute(
      'aria-label',
      toggleName(label.textContent ?? '', est.hidden ? '' : (est.textContent ?? ''), togglePhrase),
    );
  };
  const renderEst = (): void => {
    est.textContent = estimate(words, rate, T('Min', 'min'));
    nameToggle();
  };
  renderEst();

  // ---- state machine: idle → speaking ⇄ paused → idle ------------------
  let state: State = 'idle';
  let queueIndex = 0;
  let gen = 0;
  let keepalive: number | undefined;
  // `charOffset` is where the current utterance's text starts inside the
  // chunk; `lastBoundary` the last word boundary the engine reported. Engines
  // that never fire boundary events leave it at 0 and an elapsed-time
  // estimate by spoken weight takes over (slightly conservative: repeating a
  // word beats skipping one never heard; the sentence's end re-syncs).
  let charOffset = 0;
  let lastBoundary = 0;
  let utterStart = 0;
  let utterRate = 1;
  const CPS = (WPM * 6) / 60; // chars/sec at 1×: ~5 letters + space per word
  const spokenInUtterance = (): number => {
    if (lastBoundary > 0) return lastBoundary;
    if (!utterStart) return 0;
    const elapsed = (performance.now() - utterStart) / 1000;
    const said = chunk(queueIndex).slice(charOffset);
    return charAtSpoken(said, elapsed * CPS * utterRate * 0.94);
  };
  /** Absolute position of the voice in `text`. */
  const position = (): number => {
    const start = chunkAt[queueIndex] ?? 0;
    const end = start + (chunks[queueIndex]?.length ?? 1) - 1;
    const extra = state === 'speaking' ? spokenInUtterance() : 0;
    return Math.min(start + charOffset + extra, end);
  };

  // ---- position persistence: pause, browse away, come back, resume ------
  const storeKey = POSITION_KEY + ':' + location.pathname;
  const saveProgress = (): void => {
    try {
      sessionStorage.setItem(
        storeKey,
        JSON.stringify({ i: queueIndex, o: charOffset, rate, n: chunks.length }),
      );
    } catch {
      /* storage full/blocked: the place lives for this page only */
    }
  };
  const clearProgress = (): void => {
    try {
      sessionStorage.removeItem(storeKey);
    } catch {
      /* ignore */
    }
  };
  const setRateLabel = (): void => {
    rateBtn.textContent = rate + '×';
    rateBtn.dataset.rate = String(rate);
    rateBtn.setAttribute(
      'aria-label',
      T('RateAria', 'Playback rate: {rate}x. Press to change').replace('{rate}', String(rate)),
    );
  };
  setRateLabel();
  try {
    const saved = restorePosition(sessionStorage.getItem(storeKey), chunks);
    if (saved === 'stale') clearProgress();
    else if (saved) {
      queueIndex = saved.index;
      charOffset = saved.offset;
    }
  } catch {
    /* unreadable storage: no saved position */
  }

  const stopKeepalive = (): void => {
    if (keepalive !== undefined) {
      clearInterval(keepalive);
      keepalive = undefined;
    }
  };
  const startKeepalive = (): void => {
    stopKeepalive();
    // Chrome pauses synthesis on long runs / background tabs; a periodic
    // resume() is the documented workaround.
    keepalive = window.setInterval(() => {
      if (state === 'speaking' && synth.paused) synth.resume();
    }, 5000);
  };

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the text under the voice ---------------------------------------
  const wordAt = (a: number): [number, number] => {
    const s0 = docMap.text;
    let s = Math.max(0, Math.min(a, s0.length - 1));
    while (s > 0 && s0[s - 1] !== ' ') s--;
    while (s < s0.length && s0[s] === ' ') s++;
    if (s >= s0.length) return [-1, -1];
    let e = s0.indexOf(' ', s);
    if (e < 0) e = s0.length;
    return [s, e];
  };
  const at32 = (a: Int32Array, i: number): number => a[i] ?? -1;
  const rangeFor = (s: number, e: number): Range | null => {
    const { nodes, nodeIdx, nodeOff } = docMap;
    let i = s;
    while (i < e && at32(nodeIdx, i) < 0) i++;
    let j = e - 1;
    while (j > i && at32(nodeIdx, j) < 0) j--;
    if (i >= e || at32(nodeIdx, i) < 0 || at32(nodeIdx, j) < 0) return null;
    const a = nodes[at32(nodeIdx, i)];
    const b = nodes[at32(nodeIdx, j)];
    if (!a?.isConnected || !b?.isConnected) return null;
    const r = document.createRange();
    r.setStart(a, at32(nodeOff, i));
    r.setEnd(b, at32(nodeOff, j) + 1);
    return r;
  };

  // ---- drying ink --------------------------------------------------------
  // What the voice has passed fades, in three steps, each ink keeping its
  // own colour and only losing brightness (80 %, 65 %, then 50 % for text
  // that has set). Readers who ask the system for more contrast get none.
  const HL = 'highlights' in CSS && typeof Highlight === 'function';
  const DRY = [0.8, 0.65, 0.5]; // wet · drying · set
  const moreContrast = matchMedia('(prefers-contrast: more)');
  const inkRules = document.createElement('style');
  document.head.appendChild(inkRules);
  const inks = new Map<string, Highlight>();
  const inkOf = new WeakMap<Element, string>();
  const colourKey = (el: Element): string => {
    let k = inkOf.get(el);
    if (k) return k;
    const m = getComputedStyle(el).color.match(/[\d.]+/g) ?? ['20', '17', '15', '1'];
    k = m.slice(0, 3).join('-') + '-' + (m[3] ?? '1');
    inkOf.set(el, k);
    return k;
  };
  const inkFor = (key: string, step: number): Highlight => {
    const name = 'sp-ink-' + step + '-' + key.replace(/\./g, '_');
    let h = inks.get(name);
    if (h) return h;
    h = new Highlight();
    inks.set(name, h);
    CSS.highlights.set(name, h);
    const [r, g, b, a] = key.split('-').map(Number) as [number, number, number, number];
    inkRules.sheet?.insertRule(
      `::highlight(${name}){color:rgb(${r} ${g} ${b} / ${+(a * (DRY[step] ?? 1)).toFixed(3)})}`,
    );
    return h;
  };
  const wordsBack = (at: number, n: number): number => {
    let s = wordAt(at)[0];
    for (let k = 0; k < n && s > 1; k++) s = wordAt(s - 2)[0];
    return Math.max(0, s);
  };
  /** Paint text [s, e) with drying step `step`, node by node, each in its own ink. */
  const paint = (s: number, e: number, step: number): void => {
    const { nodes, nodeOff, nodeFirst, nodeLast, nodeIdx } = docMap;
    for (let n = 0; n < nodes.length; n++) {
      const f = nodeFirst[n] ?? -1;
      const l = nodeLast[n] ?? -1;
      if (f < 0 || l < s || f >= e) continue;
      const node = nodes[n];
      if (!node?.isConnected || !node.parentElement) continue;
      let a = Math.max(s, f);
      let z = Math.min(e - 1, l);
      while (a <= z && at32(nodeIdx, a) !== n) a++;
      while (z >= a && at32(nodeIdx, z) !== n) z--;
      if (a > z) continue;
      const r = document.createRange();
      r.setStart(node, at32(nodeOff, a));
      r.setEnd(node, at32(nodeOff, z) + 1);
      inkFor(colourKey(node.parentElement), step).add(r);
    }
  };
  const dry = (at: number): void => {
    if (!HL) return;
    for (const h of inks.values()) h.clear();
    if (at <= 0 || state === 'idle' || moreContrast.matches) return;
    const now = wordAt(at)[0];
    const wetFrom = wordsBack(at, 3);
    const midFrom = wordsBack(at, 9);
    paint(0, midFrom, 2);
    paint(midFrom, wetFrom, 1);
    paint(wetFrom, now, 0);
  };

  // ---- reading marker ----------------------------------------------------
  // A small diffuse light drifts above the word being spoken with a soft
  // trail; it rests where the voice rests and glides on a critically damped
  // spring. Under prefers-reduced-motion it jumps: no trail, no spring.
  const TRAIL = reducedMotion ? 1 : 12;
  let marker: HTMLElement | null = null;
  let dots: HTMLElement[] = [];
  let curWord = -1;
  let wordT0 = 0;
  let wordDur = 300;
  let curRange: Range | null = null;
  let lastScroll = 0;
  let raf = 0;
  let lastFrame = 0;
  let hx = 0;
  let hy = 0;
  let vx = 0;
  let vy = 0;
  let placed = false;
  const hist: [number, number][] = [];
  const ensureMarker = (): HTMLElement => {
    if (marker) return marker;
    const m = document.createElement('div');
    m.className = 'sp-marker';
    m.setAttribute('aria-hidden', 'true');
    dots = [];
    for (let i = TRAIL - 1; i >= 0; i--) {
      const d = document.createElement('i');
      d.style.setProperty('--i', String(i));
      m.appendChild(d);
      dots[i] = d;
    }
    document.body.appendChild(m);
    marker = m;
    return m;
  };
  const dropMarker = (): void => {
    marker?.remove();
    marker = null;
    dots = [];
    curWord = -1;
    curRange = null;
    placed = false;
    hist.length = 0;
  };
  // Document coordinates of a viewport point. body positioned → relative
  // to body; static → relative to the initial containing block.
  const origin = (): { x: number; y: number } => {
    const b = document.body;
    if (getComputedStyle(b).position === 'static') return { x: -scrollX, y: -scrollY };
    const bb = b.getBoundingClientRect();
    return { x: bb.left, y: bb.top };
  };
  const markerTarget = (): { x: number; y: number } | null => {
    if (!curRange) return null;
    const rects = curRange.getClientRects();
    const r = rects[0] ?? curRange.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    const o = origin();
    const f =
      state === 'speaking'
        ? Math.min(1, (performance.now() - wordT0) / Math.max(120, wordDur))
        : 0.5;
    return { x: r.left + r.width * (0.15 + 0.7 * f) - o.x, y: r.top - 5 - o.y };
  };
  const setWord = (s: number, e: number): void => {
    curWord = s;
    curRange = rangeFor(s, e);
    wordT0 = performance.now();
    wordDur = ((spokenWeight(docMap.text.slice(s, e)) + 1) / (CPS * rate)) * 1000;
    dry(s);
  };
  const frame = (now: number): void => {
    raf = 0;
    if (state === 'idle' || !marker) return;
    const dt = Math.min(0.05, lastFrame ? (now - lastFrame) / 1000 : 0.016);
    lastFrame = now;
    if (state === 'speaking') {
      const [s, e] = wordAt(position());
      if (s >= 0 && s !== curWord) {
        setWord(s, e);
        renderPosition();
        if (follow) keepInView();
      }
    }
    const tg = markerTarget();
    if (tg) {
      if (!placed || reducedMotion || Math.abs(tg.y - hy) > 220) {
        // First placement, reduced motion, or a jump: appear there.
        hx = tg.x;
        hy = tg.y;
        vx = vy = 0;
        placed = true;
        hist.length = 0;
      } else {
        const k = 90;
        const c = 2 * Math.sqrt(k); // critical damping
        vx += (k * (tg.x - hx) - c * vx) * dt;
        vy += (k * (tg.y - hy) - c * vy) * dt;
        hx += vx * dt;
        hy += vy * dt;
      }
    }
    const bob = reducedMotion || state !== 'speaking' ? 0 : Math.sin(now / (900 / rate)) * 1.2;
    hist.unshift([hx, hy + bob]);
    if (hist.length > TRAIL * 3) hist.length = TRAIL * 3;
    for (let i = 0; i < dots.length; i++) {
      const p = hist[Math.min(hist.length - 1, i * 3)];
      const dot = dots[i];
      if (p && dot) dot.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`;
    }
    raf = requestAnimationFrame(frame);
  };
  const markerSync = (): void => {
    if (state === 'idle') {
      marker?.classList.remove('is-on');
      return;
    }
    const m = ensureMarker();
    m.classList.add('is-on');
    m.classList.toggle('is-paused', state === 'paused');
    if (!raf) {
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  // ---- following the voice, and letting go ------------------------------
  let follow = true;
  let programmatic = 0;
  const bar = root.dataset.bar ?? 'nav';
  const band = (): [number, number] => {
    const top = document.querySelector(bar)?.getBoundingClientRect().height ?? 56;
    const dockH = dock.classList.contains('is-on') ? dock.getBoundingClientRect().height + 40 : 40;
    return [top + 24, innerHeight - dockH];
  };
  const keepInView = (force = false): void => {
    if (!curRange) return;
    const r = curRange.getBoundingClientRect();
    const [top, bottom] = band();
    const now = performance.now();
    if (force || ((r.top < top || r.bottom > bottom) && now - lastScroll > 1000)) {
      lastScroll = now;
      programmatic = now;
      scrollTo({
        top: r.top + scrollY - top - (bottom - top) * 0.28,
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    }
  };
  const updateLost = (): void => {
    if (state === 'idle' || !curRange) {
      document.body.classList.remove('sp-lost');
      return;
    }
    const r = curRange.getBoundingClientRect();
    const [top, bottom] = band();
    const visible = r.bottom > top && r.top < bottom;
    // Re-arm only once the reading had been lost and the reader brought it
    // back: re-arming mid-swipe would drag the page under the finger.
    if (visible && !follow && document.body.classList.contains('sp-lost')) follow = true;
    document.body.classList.toggle('sp-lost', !follow && !visible);
    backBtn.classList.toggle('is-up', r.top < top);
  };
  const takeOver = (e: Event): void => {
    if (state === 'idle') return;
    if ((e.target as Element | null)?.closest?.('.sp-dock')) return;
    follow = false;
    setTimeout(updateLost, 80);
  };
  addEventListener('wheel', takeOver, { passive: true });
  addEventListener('touchmove', takeOver, { passive: true });
  addEventListener('keydown', (e) => {
    const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    const el = e.target as Element | null;
    if (keys.includes(e.key) && !el?.closest?.('button,input,textarea,select,[role=slider]'))
      takeOver(e);
  });
  addEventListener(
    'scroll',
    () => {
      if (!follow || performance.now() - programmatic > 900) updateLost();
    },
    { passive: true },
  );
  backBtn.addEventListener('click', () => {
    follow = true;
    document.body.classList.remove('sp-lost');
    keepInView(true);
  });

  // ---- the ruler ----------------------------------------------------------
  const drawRuler = (): void => {
    const w = ruler.clientWidth;
    const h = ruler.clientHeight;
    if (!w) return;
    const ns = 'http://www.w3.org/2000/svg';
    ticks.replaceChildren();
    const line = (x1: number, y1: number, x2: number, y2: number, cls: string): void => {
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', String(x1));
      l.setAttribute('y1', String(y1));
      l.setAttribute('x2', String(x2));
      l.setAttribute('y2', String(y2));
      l.setAttribute('class', cls);
      ticks.appendChild(l);
    };
    const mid = Math.round(h / 2) + 0.5;
    line(0, mid, w, mid, 'sp-hair');
    const step = Math.max(6, w / 90);
    for (let x = 0; x <= w; x += step) {
      const px = Math.round(x) + 0.5;
      line(px, mid - 2.5, px, mid + 2.5, 'sp-mm');
    }
    const len = Math.max(1, text.length - 1);
    for (const s of docMap.sections.slice(1)) {
      const px = Math.round((s.at / len) * w) + 0.5;
      line(px, mid - 7, px, mid + 7, 'sp-mark');
    }
  };
  const fromX = (clientX: number): number => {
    const r = ruler.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return Math.round(f * (text.length - 1));
  };
  const setBar = (at: number): void => {
    ruler.style.setProperty('--p', String(at / Math.max(1, text.length - 1)));
  };
  const showPeek = (at: number, clientX: number): void => {
    const s = sentenceStart(text, at);
    const sec = sectionAt(docMap.sections, s);
    const when = clock((s / Math.max(1, text.length - 1)) * duration(words, rate));
    peekWhen.textContent = when + (sec.title ? ' · ' + sec.title : '');
    const snippet = text.slice(s, s + 64);
    const cut = snippet.lastIndexOf(' ');
    peekText.textContent = (cut > 20 ? snippet.slice(0, cut) : snippet) + '…';
    const r = ruler.getBoundingClientRect();
    const half = (peek.offsetWidth || 220) / 2;
    const x = Math.min(
      Math.max(clientX - r.left, half - r.left + 10),
      innerWidth - 10 - half - r.left,
    );
    peek.style.left = x + 'px';
    ruler.classList.add('is-peek');
  };
  let drag: number | null = null;
  ruler.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || drag !== null) showPeek(fromX(e.clientX), e.clientX);
    if (drag !== null) {
      drag = fromX(e.clientX);
      setBar(drag);
    }
  });
  ruler.addEventListener('pointerleave', () => {
    if (drag === null) ruler.classList.remove('is-peek');
  });
  ruler.addEventListener('pointerdown', (e) => {
    ruler.setPointerCapture(e.pointerId);
    ruler.classList.add('is-drag');
    drag = fromX(e.clientX);
    setBar(drag);
    showPeek(drag, e.clientX);
  });
  ruler.addEventListener('pointerup', () => {
    if (drag === null) return;
    ruler.classList.remove('is-drag', 'is-peek');
    const at = drag;
    drag = null;
    seek(at);
  });
  ruler.addEventListener('pointercancel', () => {
    drag = null;
    ruler.classList.remove('is-drag', 'is-peek');
    renderPosition();
  });
  ruler.addEventListener('keydown', (e) => {
    const here = sentenceStart(text, position());
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const m = /[.!?…][»"”’)\]]* /.exec(text.slice(here));
      if (m) seek(here + m.index + m[0].length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seek(here > 1 ? sentenceStart(text, here - 2) : 0);
    } else if (e.key === 'Home') {
      e.preventDefault();
      seek(0);
    }
  });
  const seek = (at: number): void => {
    const s = sentenceStart(text, at);
    const { index, offset } = locate(chunkAt, s);
    follow = true;
    document.body.classList.remove('sp-lost');
    curWord = -1;
    if (state === 'speaking') {
      gen++;
      synth.cancel();
      speakFrom(index, offset);
      return;
    }
    queueIndex = index;
    charOffset = offset;
    lastBoundary = 0;
    saveProgress();
    if (state === 'idle') return start();
    // Paused: move the reading there and stay paused.
    const [ws, we] = wordAt(position());
    if (ws >= 0) setWord(ws, we);
    keepInView(true);
    render();
  };

  // ---- rendering --------------------------------------------------------
  let lastSec = -1;
  const renderPosition = (): void => {
    const at = position();
    const len = Math.max(1, text.length - 1);
    const total = duration(words, rate);
    if (drag === null) setBar(at);
    const now = clock((at / len) * total);
    const all = clock(total);
    timeEl.textContent = now + ' / ' + all;
    ruler.setAttribute('aria-valuenow', String(Math.round((at / len) * 100)));
    ruler.setAttribute(
      'aria-valuetext',
      T('PositionText', '{at} of {total}').replace('{at}', now).replace('{total}', all),
    );
    const sec = sectionAt(docMap.sections, at);
    if (sec.index !== lastSec) {
      lastSec = sec.index;
      secEl.textContent = sec.title;
    }
  };
  const render = (): void => {
    markerSync();
    const on = state !== 'idle';
    // Idle with a saved position (from a previous visit) is presented as
    // Resume: the reader left mid-chapter and comes back.
    const resumable =
      state === 'paused' || (state === 'idle' && (queueIndex > 0 || charOffset > 0));
    toggle.setAttribute('aria-pressed', String(state === 'speaking'));
    icon.textContent = state === 'speaking' ? '❚❚' : '▶';
    label.textContent =
      state === 'speaking'
        ? T('Pause', 'Pause')
        : resumable
          ? T('Resume', 'Resume')
          : T('Listen', 'Listen');
    togglePhrase =
      state === 'speaking'
        ? T('PauseAria', 'Pause listening')
        : resumable
          ? T('ResumeAria', 'Resume listening')
          : T('ListenAria', 'Listen to this chapter');
    est.hidden = on;
    nameToggle();
    playBtn.classList.toggle('is-playing', state === 'speaking');
    playBtn.setAttribute(
      'aria-label',
      state === 'speaking'
        ? T('PauseAria', 'Pause listening')
        : T('ResumeAria', 'Resume listening'),
    );
    const wasOn = dock.classList.contains('is-on');
    dock.classList.toggle('is-on', on);
    document.body.classList.toggle('sp-on', on);
    if (on && !wasOn) requestAnimationFrame(drawRuler);
    document.body.style.paddingBottom = on ? dock.getBoundingClientRect().height + 34 + 'px' : '';
    if (!on) {
      document.body.classList.remove('sp-lost');
      dry(0);
    }
    renderPosition();
  };
  const say = (msg: string): void => {
    live.textContent = msg;
  };

  const speakFrom = (i: number, offset = 0): void => {
    if (i >= chunks.length) {
      // Natural end: the chapter is finished — the saved place dies with it.
      state = 'idle';
      queueIndex = 0;
      charOffset = 0;
      clearProgress();
      stopKeepalive();
      render();
      say(T('Stopped', 'Stopped'));
      return;
    }
    queueIndex = i;
    const c = chunk(i);
    // Snap the offset back to a word boundary so the utterance never
    // starts mid-word; a broken offset degrades to the chunk start.
    charOffset = offset > 0 && offset < c.length - 1 ? c.lastIndexOf(' ', offset) + 1 : 0;
    lastBoundary = 0;
    saveProgress();
    const g = gen;
    const u = new SpeechSynthesisUtterance(c.slice(charOffset));
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? docLang;
    u.rate = rate;
    utterStart = performance.now();
    utterRate = rate;
    u.onstart = () => {
      // Engines queue; the clock starts when sound actually starts.
      if (g === gen) utterStart = performance.now();
    };
    u.onboundary = (e) => {
      if (g === gen && typeof e.charIndex === 'number' && e.charIndex > 0)
        lastBoundary = e.charIndex;
    };
    u.onend = () => {
      if (g !== gen) return; // stale: a cancel() superseded this queue
      if (state === 'speaking') speakFrom(queueIndex + 1);
    };
    u.onerror = (e) => {
      if (g !== gen) return; // stale
      // Our own cancel() surfaces as interrupted/canceled — not an error.
      // Anything else (voice vanished, engine died): stop cleanly.
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      state = 'idle';
      stopKeepalive();
      render();
    };
    synth.speak(u);
  };

  const start = (): void => {
    // Re-read the chapter before speaking: a browser translation since the
    // page loaded means the DOM now holds the reader's language, and
    // re-chunking invalidates any saved place.
    warm();
    const freshMap = mapDocument();
    const fresh = freshMap.text;
    docMap = freshMap;
    if (fresh && fresh !== text) {
      text = fresh;
      words = text.split(' ').length;
      chunks = sentences(text);
      chunkAt = chunkStarts(text, chunks);
      queueIndex = 0;
      charOffset = 0;
      lastBoundary = 0;
      clearProgress();
      renderEst();
    }
    const nowLang = liveLang();
    if (nowLang !== docLang) {
      docLang = nowLang;
      pickVoice();
    }
    gen++;
    synth.cancel(); // never stack on a previous run
    state = 'speaking';
    follow = true;
    curWord = -1;
    render();
    startKeepalive();
    speakFrom(queueIndex, charOffset);
    say(T('Reading', 'Reading'));
  };

  // Pausing cancels the engine outright; the place lives in queueIndex +
  // charOffset, frozen BEFORE cancel() (the boundary counter dies with it).
  const pause = (): void => {
    charOffset = charOffset + spokenInUtterance();
    state = 'paused';
    lastBoundary = 0;
    gen++;
    synth.cancel();
    saveProgress();
    stopKeepalive();
    render();
    say(T('Paused', 'Paused'));
  };
  const resume = (): void => {
    if (readDocument() !== text) return start();
    state = 'speaking';
    follow = true;
    render();
    startKeepalive();
    speakFrom(queueIndex, charOffset);
    say(T('Reading', 'Reading'));
  };
  const stopAll = (): void => {
    gen++;
    state = 'idle';
    queueIndex = 0;
    charOffset = 0;
    lastBoundary = 0;
    clearProgress(); // Stop is the reader saying "from the top next time"
    stopKeepalive();
    synth.cancel();
    render();
    say(T('Stopped', 'Stopped'));
  };
  const toggleRun = (): void => {
    if (state === 'idle') return start();
    if (state === 'speaking') return pause();
    return resume();
  };

  // Page teardown is NOT Stop: the voice must not outlive the page, but the
  // place must.
  const teardown = (): void => {
    if (state === 'speaking') charOffset = charOffset + spokenInUtterance();
    if (state !== 'idle' || queueIndex > 0 || charOffset > 0) saveProgress();
    gen++;
    stopKeepalive();
    if (warmed) synth.cancel();
    state = 'idle';
    dropMarker();
    dry(0);
    dock.remove();
    document.body.classList.remove('sp-lost', 'sp-on');
    document.body.style.paddingBottom = '';
  };

  // ---- touch a sentence to hear it ---------------------------------------
  // While the player is on, a click on the text starts the voice at the head
  // of that sentence. Links, buttons and a text selection keep their meaning.
  const indexAt = (node: Node, offset: number): number => {
    const n = docMap.nodes.indexOf(node as Text);
    if (n < 0) return -1;
    const first = docMap.nodeFirst[n] ?? -1;
    const last = docMap.nodeLast[n] ?? -1;
    for (let i = first; i >= 0 && i <= last; i++)
      if (at32(docMap.nodeIdx, i) === n && at32(docMap.nodeOff, i) >= offset) return i;
    return last;
  };
  target?.addEventListener('click', (e) => {
    if (state === 'idle') return;
    const el = e.target as Element;
    if (el.closest('a,button,input,textarea,select,summary,label,[role=button]')) return;
    if (String(getSelection() ?? '').trim()) return;
    const doc = document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    let node: Node | null = null;
    let off = 0;
    if (doc.caretPositionFromPoint) {
      const c = doc.caretPositionFromPoint(e.clientX, e.clientY);
      if (c) [node, off] = [c.offsetNode, c.offset];
    } else if (doc.caretRangeFromPoint) {
      const c = doc.caretRangeFromPoint(e.clientX, e.clientY);
      if (c) [node, off] = [c.startContainer, c.startOffset];
    }
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const at = indexAt(node, off);
    if (at >= 0) seek(at);
  });

  toggle.addEventListener('click', toggleRun);
  playBtn.addEventListener('click', toggleRun);
  stopBtn.addEventListener('click', stopAll);

  rateBtn.addEventListener('click', () => {
    rate = nextRate(rate);
    storeRate(rate);
    setRateLabel();
    renderEst();
    // Apply mid-run, keeping the word position.
    if (state === 'speaking') {
      gen++;
      charOffset = charOffset + spokenInUtterance();
      lastBoundary = 0;
      synth.cancel();
      speakFrom(queueIndex, charOffset);
    } else if (queueIndex > 0 || charOffset > 0) {
      saveProgress(); // keep the stored rate in step with the position
    }
    renderPosition();
  });

  // Layout can move under the reading: redraw the ruler; the marker re-reads
  // its range every frame.
  addEventListener('resize', () => {
    if (state !== 'idle') drawRuler();
  });

  addEventListener('pagehide', teardown);
  document.addEventListener('astro:before-swap', teardown);

  render(); // reflect a restored position (Resume) on first paint
}

for (const root of document.querySelectorAll<HTMLElement>('.speech-player')) initPlayer(root);
