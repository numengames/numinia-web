'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { parseCodexMarkdown, getTotalFragments } from '@/lib/codex/parser';
import type { CodexChapter } from '@/lib/codex/types';
import { ChevronLeft, ChevronRight, BookOpen, Download, Loader2 } from 'lucide-react';

/**
 * Codex — a markdown document viewer inside the L.A.P.
 *
 * Fetches the original .md file from /public/codex/ and renders it
 * as a paginated, beautifully typeset book. The file is the single
 * source of truth (File Over App).
 */

const CODEX_MD_URL = '/codex/numinia-rpg-v0.0.9.md';

export function Codex() {
  // ── Content ───────────────────────────────────────────────
  const [chapters, setChapters] = useState<CodexChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rawRef = useRef('');

  // ── Navigation ────────────────────────────────────────────
  const [chapterIdx, setChapterIdx] = useState(0);
  const [fragmentIdx, setFragmentIdx] = useState(0);
  const [showIndex, setShowIndex] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Load markdown ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(CODEX_MD_URL)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((raw) => {
        if (cancelled) return;
        rawRef.current = raw;
        setChapters(parseCodexMarkdown(raw));
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const total = getTotalFragments(chapters);
  const ch = chapters[chapterIdx];
  const frag = ch?.fragments[fragmentIdx];

  let globalPage = 0;
  for (let i = 0; i < chapterIdx; i++) globalPage += chapters[i]?.fragments.length ?? 0;
  globalPage += fragmentIdx + 1;

  const canPrev = chapterIdx > 0 || fragmentIdx > 0;
  const canNext = ch ? chapterIdx < chapters.length - 1 || fragmentIdx < ch.fragments.length - 1 : false;

  // ── Nav helpers ───────────────────────────────────────────
  const scrollTop = useCallback(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }), []);

  const goNext = useCallback(() => {
    if (!ch) return;
    if (fragmentIdx < ch.fragments.length - 1) { setFragmentIdx(fragmentIdx + 1); }
    else if (chapterIdx < chapters.length - 1) { setChapterIdx(chapterIdx + 1); setFragmentIdx(0); }
    scrollTop();
  }, [ch, chapterIdx, fragmentIdx, chapters.length, scrollTop]);

  const goPrev = useCallback(() => {
    if (fragmentIdx > 0) { setFragmentIdx(fragmentIdx - 1); }
    else if (chapterIdx > 0) { const prev = chapters[chapterIdx - 1]; setChapterIdx(chapterIdx - 1); setFragmentIdx(prev.fragments.length - 1); }
    scrollTop();
  }, [chapterIdx, fragmentIdx, chapters, scrollTop]);

  const goTo = useCallback((ci: number, fi: number) => {
    setChapterIdx(ci); setFragmentIdx(fi); setShowIndex(false); scrollTop();
  }, [scrollTop]);

  // ── Download original ─────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!rawRef.current) return;
    const blob = new Blob([rawRef.current], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Numinia el juego de rol v0.0.9.md';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Keyboard ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  // ── Loading / Error ───────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !chapters.length || !ch || !frag) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 text-sm">
        {error ? `Error: ${error}` : 'No se encontró el códice.'}
      </div>
    );
  }

  const chapterLabel = ch.number !== null ? `Capítulo ${ch.number}` : 'Introducción';

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-1rem)] max-h-screen">
      {/* ── Index sidebar (collapsible) ─────────────────────── */}
      {showIndex && (
        <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Índice</span>
            <button onClick={() => setShowIndex(false)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <nav className="py-2">
            {chapters.map((c, ci) => (
              <div key={c.id}>
                <button
                  onClick={() => goTo(ci, 0)}
                  className={`w-full text-left px-4 py-1.5 text-xs font-medium transition-colors ${ci === chapterIdx ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  {c.number !== null ? `${c.number}. ` : ''}{c.title}
                </button>
                {c.fragments.map((f, fi) => (
                  <button
                    key={f.id}
                    onClick={() => goTo(ci, fi)}
                    className={`w-full text-left px-6 py-1 text-[11px] transition-colors ${ci === chapterIdx && fi === fragmentIdx ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-400'}`}
                  >
                    {f.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </aside>
      )}

      {/* ── Main reading area ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIndex(!showIndex)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Índice"
            >
              <BookOpen size={16} />
            </button>
            <span className="text-xs text-gray-400 hidden sm:inline">{chapterLabel}</span>
          </div>

          <span className="text-xs text-gray-400">{globalPage} / {total}</span>

          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              title="Descargar .md"
            >
              <Download size={16} />
            </button>
            <button onClick={goPrev} disabled={!canPrev} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-25">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goNext} disabled={!canNext} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-25">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#f5f0e8] dark:bg-[#1a1814]">
          <article className="max-w-3xl mx-auto px-6 py-8 sm:px-10 sm:py-12">
            {/* Chapter label */}
            <div className="text-center mb-1">
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-700/50 dark:text-amber-500/40 font-medium">
                {chapterLabel}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-center text-xl sm:text-2xl font-bold text-[#4a2020] dark:text-amber-200/90 mb-1 leading-tight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {frag.title}
            </h2>

            {/* Divider */}
            <div className="mx-auto w-16 h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent mb-6 mt-3" />

            {/* Body — original text rendered as HTML */}
            <div
              className="codex-body text-[#3d2b1f] dark:text-gray-300 leading-[1.85] text-[15px] sm:text-base"
              style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              dangerouslySetInnerHTML={{ __html: frag.body }}
            />

            {/* Page number */}
            <div className="text-center mt-10 text-xs text-amber-700/30 dark:text-amber-500/20 tracking-widest">
              — {globalPage} —
            </div>
          </article>
        </div>
      </div>

      {/* Inline styles for body typography */}
      <style jsx global>{`
        .codex-body p { margin-bottom: 1em; text-align: justify; hyphens: auto; }
        .codex-body blockquote { border-left: 2px solid rgba(180,140,60,0.3); margin: 1.5em 0; padding: 0.6em 1em; font-style: italic; opacity: 0.85; }
        .codex-body blockquote p { margin-bottom: 0.5em; }
        .codex-body ul, .codex-body ol { margin: 1em 0; padding-left: 1.5em; }
        .codex-body li { margin-bottom: 0.4em; }
        .codex-body strong { color: #1a0e08; font-weight: 600; }
        .dark .codex-body strong { color: #e8d5b0; }
        .codex-body em { color: #8a7333; }
        .dark .codex-body em { color: #c9a84c; }
        .codex-body br { display: block; margin-top: 0.3em; content: ''; }
      `}</style>
    </div>
  );
}
