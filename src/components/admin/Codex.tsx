'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseCodexMarkdown, getTotalFragments } from '@/lib/codex/parser';
import type { CodexChapter } from '@/lib/codex/types';
import { useBookmark } from '@/lib/codex/bookmark';
import { CodexAudio } from '@/lib/codex/audio';
import { ChevronLeft, ChevronRight, BookOpen, Download, Volume2, VolumeX, X, Loader2 } from 'lucide-react';
import './codex.css';

const CODEX_MD_URL = '/codex/numinia-rpg-v0.0.9.md';
const SOUND_KEY = 'numinia-codex-sound';

// ── Sub-components ──────────────────────────────────────────────

function BookmarkRibbon({ hasSaved, onClick }: { hasSaved: boolean; onClick: () => void }) {
  return (
    <motion.button
      className={`codex-ribbon ${hasSaved ? 'codex-ribbon--saved' : ''}`}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      title={hasSaved ? 'Marcador guardado' : 'Guardar marcador'}
      aria-label="Bookmark"
    />
  );
}

function PageTurnZone({ direction, onClick, disabled }: { direction: 'left' | 'right'; onClick: () => void; disabled: boolean }) {
  return (
    <button
      className={`codex-turn codex-turn--${direction}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Página anterior' : 'Página siguiente'}
    >
      {direction === 'left' ? <ChevronLeft /> : <ChevronRight />}
    </button>
  );
}

function ChapterOverlay({
  isOpen, chapters, chapterIdx, fragmentIdx, onNavigate, onClose,
}: {
  isOpen: boolean;
  chapters: CodexChapter[];
  chapterIdx: number;
  fragmentIdx: number;
  onNavigate: (ci: number, fi: number) => void;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="codex-index-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="codex-index"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="codex-index-head">
              <span>Índice</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(201,168,76,0.5)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div className="codex-index-list">
              {chapters.map((c, ci) => (
                <div key={c.id}>
                  <button
                    className={`codex-index-ch ${ci === chapterIdx ? 'active' : ''}`}
                    onClick={() => onNavigate(ci, 0)}
                  >
                    {c.number !== null ? `${c.number}. ` : ''}{c.title}
                  </button>
                  {c.fragments.map((f, fi) => (
                    <button
                      key={f.id}
                      className={`codex-index-frag ${ci === chapterIdx && fi === fragmentIdx ? 'active' : ''}`}
                      onClick={() => onNavigate(ci, fi)}
                    >
                      {f.title}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ResumeToast({ chapterTitle, onResume, onDismiss }: { chapterTitle: string; onResume: () => void; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <motion.div
      className="codex-toast"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
    >
      <span>Continuar en {chapterTitle}?</span>
      <button onClick={onResume}>Continuar</button>
      <button onClick={onDismiss} style={{ borderColor: 'transparent', opacity: 0.5 }}>✕</button>
    </motion.div>
  );
}

// ── Main component ──────────────────────────────────────────────

export function Codex() {
  // ── Content ─────────────────────────────────────────────────
  const [chapters, setChapters] = useState<CodexChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rawRef = useRef('');

  // ── Navigation ──────────────────────────────────────────────
  const [chapterIdx, setChapterIdx] = useState(0);
  const [fragmentIdx, setFragmentIdx] = useState(0);
  const [showIndex, setShowIndex] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const dirRef = useRef(1); // 1 = forward, -1 = backward
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasNavigatedRef = useRef(false);

  // ── Bookmark ────────────────────────────────────────────────
  const { bookmark, saveBookmark } = useBookmark();
  const [bookmarkSaved, setBookmarkSaved] = useState(false);

  // ── Audio ───────────────────────────────────────────────────
  const audioRef = useRef<CodexAudio | null>(null);
  const [soundOn, setSoundOn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SOUND_KEY) === '1';
  });
  const prevChapterRef = useRef(0);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new CodexAudio();
    audioRef.current.init();
    return audioRef.current;
  }, []);

  // ── Load markdown ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(CODEX_MD_URL)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(raw => {
        if (cancelled) return;
        rawRef.current = raw;
        setChapters(parseCodexMarkdown(raw));
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── Show resume toast if bookmark exists ────────────────────
  useEffect(() => {
    if (chapters.length && bookmark && !hasNavigatedRef.current) {
      setShowResume(true);
    }
  }, [chapters.length, bookmark]);

  // ── Derived ─────────────────────────────────────────────────
  const total = getTotalFragments(chapters);
  const ch = chapters[chapterIdx];
  const frag = ch?.fragments[fragmentIdx];
  let globalPage = 0;
  for (let i = 0; i < chapterIdx; i++) globalPage += chapters[i]?.fragments.length ?? 0;
  globalPage += fragmentIdx + 1;
  const canPrev = chapterIdx > 0 || fragmentIdx > 0;
  const canNext = ch ? chapterIdx < chapters.length - 1 || fragmentIdx < ch.fragments.length - 1 : false;

  // ── Navigation ──────────────────────────────────────────────
  const scrollTop = useCallback(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' }), []);

  const goNext = useCallback(() => {
    if (!ch) return;
    dirRef.current = 1;
    hasNavigatedRef.current = true;
    if (fragmentIdx < ch.fragments.length - 1) {
      setFragmentIdx(fragmentIdx + 1);
    } else if (chapterIdx < chapters.length - 1) {
      setChapterIdx(chapterIdx + 1);
      setFragmentIdx(0);
    }
    scrollTop();
    if (soundOn) { try { ensureAudio().playPageTurn(); } catch {} }
  }, [ch, chapterIdx, fragmentIdx, chapters.length, scrollTop, soundOn, ensureAudio]);

  const goPrev = useCallback(() => {
    if (!ch) return;
    dirRef.current = -1;
    hasNavigatedRef.current = true;
    if (fragmentIdx > 0) {
      setFragmentIdx(fragmentIdx - 1);
    } else if (chapterIdx > 0) {
      const prev = chapters[chapterIdx - 1];
      setChapterIdx(chapterIdx - 1);
      setFragmentIdx(prev.fragments.length - 1);
    }
    scrollTop();
    if (soundOn) { try { ensureAudio().playPageTurn(); } catch {} }
  }, [ch, chapterIdx, fragmentIdx, chapters, scrollTop, soundOn, ensureAudio]);

  const goTo = useCallback((ci: number, fi: number) => {
    dirRef.current = ci > chapterIdx || (ci === chapterIdx && fi > fragmentIdx) ? 1 : -1;
    hasNavigatedRef.current = true;
    setChapterIdx(ci);
    setFragmentIdx(fi);
    setShowIndex(false);
    scrollTop();
    if (soundOn) { try { ensureAudio().playPageTurn(); } catch {} }
  }, [chapterIdx, fragmentIdx, scrollTop, soundOn, ensureAudio]);

  // ── Chapter transition sound ────────────────────────────────
  useEffect(() => {
    if (prevChapterRef.current !== chapterIdx && hasNavigatedRef.current && soundOn) {
      try { ensureAudio().playChapterTransition(); } catch {}
    }
    prevChapterRef.current = chapterIdx;
  }, [chapterIdx, soundOn, ensureAudio]);

  // ── Auto-save bookmark ──────────────────────────────────────
  useEffect(() => {
    if (!chapters.length || !hasNavigatedRef.current) return;
    const t = setTimeout(() => {
      saveBookmark({ chapterIndex: chapterIdx, fragmentIndex: fragmentIdx, scrollPosition: 0, timestamp: Date.now() });
      setBookmarkSaved(true);
    }, 1000);
    return () => clearTimeout(t);
  }, [chapterIdx, fragmentIdx, chapters.length, saveBookmark]);

  // ── Keyboard ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showIndex) { if (e.key === 'Escape') setShowIndex(false); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, showIndex]);

  // ── Sound toggle persist ────────────────────────────────────
  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    if (next) { try { ensureAudio().playPageTurn(); } catch {} }
  }, [soundOn, ensureAudio]);

  // ── Download ────────────────────────────────────────────────
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

  // ── Resume from bookmark ────────────────────────────────────
  const handleResume = useCallback(() => {
    if (bookmark) {
      setChapterIdx(bookmark.chapterIndex);
      setFragmentIdx(bookmark.fragmentIndex);
      hasNavigatedRef.current = true;
    }
    setShowResume(false);
  }, [bookmark]);

  // ── Cleanup audio ───────────────────────────────────────────
  useEffect(() => () => { audioRef.current?.dispose(); }, []);

  // ── Loading / Error ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="codex-container">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'rgba(201,168,76,0.5)' }} />
      </div>
    );
  }

  if (error || !chapters.length || !ch || !frag) {
    return (
      <div className="codex-container" style={{ color: 'rgba(201,168,76,0.5)', fontFamily: 'serif', fontSize: '0.85rem' }}>
        {error ? `Error: ${error}` : 'No se encontró el códice.'}
      </div>
    );
  }

  const chapterLabel = ch.number !== null ? `Capítulo ${ch.number}` : 'Introducción';

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="codex-container">
      <div className="codex-book">
        {/* Bookmark ribbon */}
        <BookmarkRibbon
          hasSaved={bookmarkSaved}
          onClick={() => {
            saveBookmark({ chapterIndex: chapterIdx, fragmentIndex: fragmentIdx, scrollPosition: 0, timestamp: Date.now() });
            setBookmarkSaved(true);
          }}
        />

        {/* Parchment page */}
        <div className="codex-page" ref={scrollRef}>
          {/* Page turn zones */}
          <PageTurnZone direction="left" onClick={goPrev} disabled={!canPrev} />
          <PageTurnZone direction="right" onClick={goNext} disabled={!canNext} />

          {/* Control: index toggle (top-left) */}
          <button className="codex-ctrl codex-ctrl--tl" onClick={() => setShowIndex(true)} title="Índice" aria-label="Abrir índice">
            <BookOpen size={16} />
          </button>

          {/* Control: download (bottom-left) */}
          <button className="codex-ctrl codex-ctrl--bl" onClick={handleDownload} title="Descargar .md" aria-label="Descargar markdown">
            <Download size={16} />
          </button>

          {/* Control: sound toggle (bottom-right) */}
          <button className="codex-ctrl codex-ctrl--br" onClick={toggleSound} title={soundOn ? 'Silenciar' : 'Activar sonido'} aria-label="Toggle sonido">
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Page content (animated) */}
          <AnimatePresence mode="wait">
            <motion.article
              key={`${chapterIdx}-${fragmentIdx}`}
              initial={{ opacity: 0, x: dirRef.current * 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dirRef.current * -15 }}
              transition={{ duration: 0.22 }}
              style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', paddingTop: 'clamp(2.5rem, 5vw, 3.5rem)' }}
              role="article"
              aria-label={`${chapterLabel} — ${frag.title}`}
            >
              <div className="codex-chapter-label">{chapterLabel}</div>
              <h2 className="codex-title">{frag.title}</h2>
              <div className="codex-divider" />
              <div className="codex-body" dangerouslySetInnerHTML={{ __html: frag.body }} />
              <div className="codex-pagenum">— {globalPage} / {total} —</div>
            </motion.article>
          </AnimatePresence>

          {/* Resume toast */}
          <AnimatePresence>
            {showResume && bookmark && chapters[bookmark.chapterIndex] && (
              <ResumeToast
                chapterTitle={chapters[bookmark.chapterIndex].title}
                onResume={handleResume}
                onDismiss={() => setShowResume(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chapter index overlay */}
      <ChapterOverlay
        isOpen={showIndex}
        chapters={chapters}
        chapterIdx={chapterIdx}
        fragmentIdx={fragmentIdx}
        onNavigate={goTo}
        onClose={() => setShowIndex(false)}
      />
    </div>
  );
}
