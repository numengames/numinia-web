/**
 * Codex reader behavior (MIS-085 B): e-reader ergonomics over the book
 * plane. Chrome compacts on scroll down (never hides — Oracle amendment
 * 2026-08-18) and recovers on scroll up; the manual
 * keeps its OWN Diurno/Nocturno choice (D13) and text size in localStorage;
 * the bookmark is D3's schema; the lunar phase only grows (§10.1-06);
 * corner frames draw themselves once per view; the DJ aside types itself.
 * Everything honors prefers-reduced-motion.
 */

interface Bookmark {
  readonly version: 1;
  readonly chapterSlug: string;
  readonly blockId: string;
  readonly updatedAt: string;
}

const MODE_KEY = 'numinia-codex-modo';
const SIZE_KEY = 'numinia-codex-tam';
const MARK_KEY = 'numinia-codex-marca';

const root = document.querySelector<HTMLElement>('.codex');

function readBookmark(): Bookmark | null {
  try {
    const raw = localStorage.getItem(MARK_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as Bookmark).version === 1 &&
      typeof (parsed as Bookmark).chapterSlug === 'string' &&
      typeof (parsed as Bookmark).blockId === 'string'
    ) {
      return parsed as Bookmark;
    }
  } catch {
    /* an unreadable bookmark is no bookmark */
  }
  return null;
}

function topVisibleAnchor(): string {
  const blocks = document.querySelectorAll<HTMLElement>('.cuerpo [id]');
  // At the very bottom the LAST block is the one being read — the top-most
  // rule alone made a chapter's final paragraphs unmarkable (Oracle report
  // 2026-08-18: they can never reach the top of the viewport).
  const doc = document.documentElement;
  // 24px slack: engines round scroll positions differently (WebKit keeps
  // fractional pixels) and "within a line of the end" IS the end.
  if (scrollY + innerHeight >= doc.scrollHeight - 24) {
    return blocks[blocks.length - 1]?.id ?? '';
  }
  for (const block of blocks) {
    if (block.getBoundingClientRect().bottom > 90) return block.id;
  }
  return '';
}

function initReader(codex: HTMLElement): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slug = codex.dataset.slug ?? '';
  const prefix = codex.dataset.prefix ?? '';

  /* ── Modo del manual (D13) ── */
  const modeButton = codex.querySelector<HTMLButtonElement>('[data-codex-modo]');
  const syncMode = (): void => {
    const night = codex.classList.contains('nocturno');
    modeButton?.setAttribute('aria-pressed', String(night));
    const label = modeButton?.querySelector('.lbl');
    if (label) label.textContent = night ? 'Diurno' : 'Nocturno';
    codex
      .querySelector<SVGElement>('[data-ico-sol]')
      ?.style.setProperty('display', night ? 'none' : '');
    codex
      .querySelector<SVGElement>('[data-ico-luna]')
      ?.style.setProperty('display', night ? '' : 'none');
  };
  modeButton?.addEventListener('click', () => {
    const night = codex.classList.toggle('nocturno');
    try {
      localStorage.setItem(MODE_KEY, night ? 'nocturno' : 'diurno');
    } catch {
      /* private mode: the choice just does not persist */
    }
    syncMode();
  });
  syncMode();

  /* ── Tamaño de letra ── */
  codex.querySelectorAll<HTMLButtonElement>('.tams button').forEach((button) => {
    button.addEventListener('click', () => {
      const size = button.dataset.tam ?? 'm';
      codex.dataset.tam = size;
      try {
        localStorage.setItem(SIZE_KEY, size);
      } catch {
        /* non-persistent is fine */
      }
      codex
        .querySelectorAll<HTMLButtonElement>('.tams button')
        .forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
    });
  });

  /* ── Cromo que se compacta al leer (enmienda del Oráculo 2026-08-18):
     nunca desaparece — marcapáginas, índice y Narrador siempre a un
     toque — pero al bajar cede altura y palabras. El pie sí se aparta y
     vuelve al subir. ── */
  const chrome = codex.querySelector<HTMLElement>('.chrome');
  const footer = codex.querySelector<HTMLElement>('.pie');
  let lastY = 0;
  addEventListener(
    'scroll',
    () => {
      const y = scrollY;
      const down = y > lastY && y > 160;
      chrome?.classList.toggle('compacta', down);
      footer?.classList.toggle('oculto', down);
      lastY = y;
    },
    { passive: true },
  );

  /* ── Progreso lunar — solo creciente; terminar es luna llena ── */
  const phase = codex.querySelector<SVGPathElement>('[data-luna-fase]');
  const phaseText = codex.querySelector<HTMLElement>('[data-luna-txt]');
  const names = [
    'luna nueva',
    'creciente',
    'cuarto creciente',
    'gibosa creciente',
    'casi llena',
    'gibosa',
    'vísperas del plenilunio',
    'luna llena',
  ];
  const lunaPath = (fraction: number): string => {
    const r = 8.4;
    const cx = 10;
    const cy = 10;
    if (fraction <= 0.02) return '';
    if (fraction >= 0.98)
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`;
    const k = Math.cos(Math.PI * fraction);
    const rx = Math.abs(k) * r;
    const sweep = fraction < 0.5 ? 0 : 1;
    return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z`;
  };
  let maxFraction = 0;
  const onProgress = (): void => {
    const doc = document.documentElement;
    const total = doc.scrollHeight - doc.clientHeight;
    const fraction = total > 0 ? doc.scrollTop / total : 0;
    if (fraction > maxFraction) maxFraction = fraction;
    phase?.setAttribute('d', lunaPath(maxFraction));
    if (phaseText) phaseText.textContent = names[Math.min(7, Math.floor(maxFraction * 8))] ?? '';
  };
  addEventListener('scroll', onProgress, { passive: true });
  onProgress();

  /* ── Marcapáginas (D3) ── */
  const markButton = codex.querySelector<HTMLButtonElement>('[data-codex-marca]');
  const returnButton = codex.querySelector<HTMLElement>('[data-codex-volver]');
  const syncMark = (): void => {
    const mark = readBookmark();
    const here = mark !== null && mark.chapterSlug === slug && slug !== '';
    markButton?.setAttribute('aria-pressed', String(here));
    const label = markButton?.querySelector('.lbl');
    if (label) label.textContent = here ? 'Marcado' : 'Marcapáginas';
    document.querySelector('.marcado')?.classList.remove('marcado');
    if (here && mark) document.getElementById(mark.blockId)?.classList.add('marcado');
    if (returnButton instanceof HTMLAnchorElement) {
      if (mark) {
        returnButton.href = `${prefix}/lap/codex/${mark.chapterSlug}/#${mark.blockId}`;
        returnButton.style.display = '';
      } else {
        returnButton.style.display = 'none';
      }
    }
  };
  markButton?.addEventListener('click', () => {
    const current = readBookmark();
    try {
      if (current && current.chapterSlug === slug) {
        localStorage.removeItem(MARK_KEY);
      } else {
        const mark: Bookmark = {
          version: 1,
          chapterSlug: slug,
          blockId: topVisibleAnchor(),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(MARK_KEY, JSON.stringify(mark));
      }
    } catch {
      /* storage denied: the ribbon simply does not stick */
    }
    syncMark();
  });
  syncMark();

  /* ── Marcos que se dibujan al entrar en vista ── */
  if (!reduced) {
    codex.querySelectorAll<HTMLElement>('[data-dibujable]').forEach((frame) => {
      frame.classList.remove('dibujado');
      new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              frame.classList.add('dibujado');
              observer.disconnect();
            }
          });
        },
        { threshold: 0.35 },
      ).observe(frame);
    });
  }

  /* ── Tecleo del aparte del DJ (catálogo; puntual) ── */
  codex.querySelectorAll<HTMLElement>('[data-tecleo]').forEach((aside) => {
    const target = aside.querySelector<HTMLElement>('.tecleo');
    const text = target?.dataset.texto ?? '';
    if (!target) return;
    if (reduced) {
      target.textContent = text;
      aside.classList.add('terminado');
      return;
    }
    let typed = false;
    new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !typed) {
            typed = true;
            observer.disconnect();
            let index = 0;
            const step = (): void => {
              index += 1;
              target.textContent = text.slice(0, index);
              if (index < text.length) setTimeout(step, 14);
              else aside.classList.add('terminado');
            };
            step();
          }
        });
      },
      { threshold: 0.5 },
    ).observe(aside);
  });
}

if (root) initReader(root);
