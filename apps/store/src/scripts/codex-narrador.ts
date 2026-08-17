/**
 * El Narrador (MIS-085, inclusion tool proposed by the Oracle 2026-08-18):
 * the Codex reads itself aloud with the browser's own voice — Web Speech,
 * no server, no cost, nothing stored but the chosen pace. It reads block
 * by block over the SAME stable anchors that bookmarks use, highlights the
 * block that is sounding and follows it on screen (honoring
 * prefers-reduced-motion). Tables are announced by their caption — a grid
 * read cell by cell is noise, not narration.
 */

const RATE_KEY = 'numinia-codex-ritmo';
const RATES = [1, 1.25, 1.5, 0.8] as const;

const codex = document.querySelector<HTMLElement>('.codex');
const body = codex?.querySelector<HTMLElement>('.cuerpo');
const button = codex?.querySelector<HTMLButtonElement>('[data-codex-narrador]');
const rateButton = codex?.querySelector<HTMLButtonElement>('[data-codex-ritmo]');

function blockText(block: HTMLElement): string {
  if (block.classList.contains('tabla-ancla')) {
    return block.querySelector('caption')?.textContent?.trim() ?? '';
  }
  return block.textContent?.trim() ?? '';
}

/** Test seam: e2e injects a deterministic double here — replacing the
 * real `window.speechSynthesis` is not writable in every engine. */
interface SynthWindow {
  __narradorSynth?: SpeechSynthesis;
}

function initNarrator(
  root: HTMLElement,
  prose: HTMLElement,
  toggle: HTMLButtonElement,
  pace: HTMLButtonElement,
): void {
  const synth = (window as SynthWindow).__narradorSynth ?? window.speechSynthesis;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const blocks = [...prose.querySelectorAll<HTMLElement>('[id]')].filter(
    (block) => blockText(block) !== '',
  );
  if (blocks.length === 0) return;
  toggle.hidden = false;

  let rate = 1;
  try {
    rate = Number(localStorage.getItem(RATE_KEY)) || 1;
  } catch {
    /* storage denied: default pace */
  }
  if (!RATES.includes(rate as (typeof RATES)[number])) rate = 1;
  let index = 0;
  let state: 'idle' | 'reading' | 'paused' = 'idle';
  let current: HTMLElement | null = null;

  // LAZY on purpose: the platform voice stack must not be touched until
  // the reader asks for it — some engines (headless WebKit without
  // speech-dispatcher) misbehave on mere contact.
  let voice: SpeechSynthesisVoice | undefined;
  let warmed = false;
  const pickVoice = (): void => {
    const voices = synth.getVoices().filter((option) => option.lang.startsWith('es'));
    voice = voices.find((option) => option.lang === 'es-ES') ?? voices[0];
  };
  const warm = (): void => {
    if (warmed) return;
    warmed = true;
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  };

  const label = toggle.querySelector('.lbl');
  const sync = (): void => {
    toggle.setAttribute('aria-pressed', String(state === 'reading'));
    if (label) {
      label.textContent =
        state === 'reading' ? 'Pausa' : state === 'paused' ? 'Seguir' : 'Narrador';
    }
    toggle
      .querySelector<SVGElement>('[data-ico-lee]')
      ?.style.setProperty('display', state === 'reading' ? 'none' : '');
    toggle
      .querySelector<SVGElement>('[data-ico-pausa]')
      ?.style.setProperty('display', state === 'reading' ? '' : 'none');
    pace.hidden = state === 'idle';
    const paceLabel = pace.querySelector('.ritmo');
    if (paceLabel) paceLabel.textContent = `×${rate}`;
  };

  const highlight = (block: HTMLElement | null): void => {
    current?.classList.remove('narrando');
    current = block;
    if (block) {
      block.classList.add('narrando');
      block.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  };

  const stop = (): void => {
    try {
      synth.cancel();
    } catch {
      /* a broken voice cannot be more silent */
    }
    state = 'idle';
    highlight(null);
    sync();
  };

  const speakFrom = (start: number): void => {
    if (start >= blocks.length) {
      stop();
      return;
    }
    index = start;
    const block = blocks[start] as HTMLElement;
    const utterance = new SpeechSynthesisUtterance(blockText(block));
    utterance.lang = 'es-ES';
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.onstart = () => highlight(block);
    utterance.onend = () => {
      if (state === 'reading') speakFrom(start + 1);
    };
    utterance.onerror = stop;
    synth.speak(utterance);
  };

  const topVisibleIndex = (): number => {
    const found = blocks.findIndex((block) => block.getBoundingClientRect().bottom > 90);
    return found === -1 ? 0 : found;
  };

  toggle.addEventListener('click', () => {
    try {
      if (state === 'reading') {
        synth.pause();
        state = 'paused';
      } else if (state === 'paused') {
        synth.resume();
        state = 'reading';
      } else {
        warm();
        state = 'reading';
        speakFrom(topVisibleIndex());
      }
    } catch {
      // The engine has no working voice: fold the control honestly.
      state = 'idle';
      toggle.hidden = true;
      pace.hidden = true;
      return;
    }
    sync();
  });

  pace.addEventListener('click', () => {
    rate = RATES[(RATES.indexOf(rate as (typeof RATES)[number]) + 1) % RATES.length] as number;
    try {
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      /* the pace just does not persist */
    }
    if (state !== 'idle') {
      // A queued utterance keeps its old rate: restart the current block.
      const resume = state === 'reading';
      synth.cancel();
      state = resume ? 'reading' : 'paused';
      if (resume) speakFrom(index);
    }
    sync();
  });

  // Leaving the page must silence the voice — it belongs to the chapter.
  addEventListener('pagehide', () => {
    if (warmed) synth.cancel();
  });
  root.addEventListener('codex:silence', stop);
  sync();
}

if (
  codex &&
  body &&
  button &&
  rateButton &&
  ('__narradorSynth' in window || 'speechSynthesis' in window)
) {
  initNarrator(codex, body, button, rateButton);
}
