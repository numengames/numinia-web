'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { parseCodexMarkdown, getTotalFragments } from '@/lib/codex/parser';
import type { CodexChapter } from '@/lib/codex/types';
import { useBookmark } from '@/lib/codex/bookmark';
import { CodexAudio } from '@/lib/codex/audio';
import { stripHtml, speak, stopSpeaking } from '@/lib/codex/tts';
import type { VoicePreset } from '@/lib/codex/types';
import { VOICE_CONFIGS } from '@/lib/codex/types';
import { CodexCover } from './CodexCover';
import { CodexPage } from './CodexPage';
import { CodexIndex } from './CodexIndex';
import { CodexNav } from './CodexNav';
import { CodexMist } from './CodexMist';
import './codex.css';

/** Path to the original markdown source — the single source of truth. */
const CODEX_MD_URL = '/codex/numinia-rpg-v0.0.9.md';

type CodexView = 'cover' | 'reading';

export function CodexReader() {
  // ── Content (loaded from the original .md file) ───────────
  const [chapters, setChapters] = useState<CodexChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── UI State ──────────────────────────────────────────────
  const [view, setView] = useState<CodexView>('cover');
  const [chapterIdx, setChapterIdx] = useState(0);
  const [fragmentIdx, setFragmentIdx] = useState(0);
  const [isIndexOpen, setIsIndexOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoicePreset>('feminine');
  const [isMistActive, setIsMistActive] = useState(false);
  const [mistVariant, setMistVariant] = useState<'light' | 'aqueous' | 'deep'>('light');
  const [pendingNavigation, setPendingNavigation] = useState<{ ch: number; frag: number } | null>(null);
  /** Stores the raw markdown for the "Download MD" feature */
  const rawMarkdownRef = useRef<string>('');

  // ── Refs ──────────────────────────────────────────────────
  const audioRef = useRef<CodexAudio | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // ── Bookmark ──────────────────────────────────────────────
  const { bookmark, saveBookmark } = useBookmark();

  // ── Load & parse the original markdown file ───────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CODEX_MD_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.text();
        if (cancelled) return;
        rawMarkdownRef.current = raw;
        const parsed = parseCodexMarkdown(raw);
        setChapters(parsed);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Error loading codex');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived ───────────────────────────────────────────────
  const totalPages = useMemo(() => getTotalFragments(chapters), [chapters]);
  const chapter = chapters[chapterIdx];
  const fragment = chapter?.fragments[fragmentIdx];

  const globalPageNumber = useMemo(() => {
    let page = 0;
    for (let i = 0; i < chapterIdx; i++) {
      page += (chapters[i]?.fragments.length ?? 0);
    }
    return page + fragmentIdx + 1;
  }, [chapterIdx, fragmentIdx, chapters]);

  const canGoPrev = chapterIdx > 0 || fragmentIdx > 0;
  const canGoNext = chapter
    ? chapterIdx < chapters.length - 1 || fragmentIdx < chapter.fragments.length - 1
    : false;

  // ── Audio init ────────────────────────────────────────────
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new CodexAudio();
    audioRef.current.init();
    return audioRef.current;
  }, []);

  // ── Navigation helpers ────────────────────────────────────
  const scrollToTop = useCallback(() => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const navigateTo = useCallback((ch: number, frag: number, isChapterChange: boolean) => {
    if (isChapterChange) {
      const variants: Array<'light' | 'aqueous' | 'deep'> = ['light', 'aqueous', 'deep'];
      setMistVariant(variants[Math.floor(Math.random() * variants.length)]);
      setIsMistActive(true);
      setPendingNavigation({ ch, frag });
      if (isSoundEnabled) { try { ensureAudio().playChapterTransition(); } catch {} }
    } else {
      setChapterIdx(ch);
      setFragmentIdx(frag);
      scrollToTop();
      if (isSoundEnabled) { try { ensureAudio().playPageTurn(); } catch {} }
    }
    if (isTTSPlaying) { stopSpeaking(); setIsTTSPlaying(false); }
  }, [isSoundEnabled, isTTSPlaying, ensureAudio, scrollToTop]);

  const handleMistComplete = useCallback(() => {
    setIsMistActive(false);
    if (pendingNavigation) {
      setChapterIdx(pendingNavigation.ch);
      setFragmentIdx(pendingNavigation.frag);
      setPendingNavigation(null);
      scrollToTop();
    }
  }, [pendingNavigation, scrollToTop]);

  const goNext = useCallback(() => {
    if (!chapter) return;
    if (fragmentIdx < chapter.fragments.length - 1) {
      navigateTo(chapterIdx, fragmentIdx + 1, false);
    } else if (chapterIdx < chapters.length - 1) {
      navigateTo(chapterIdx + 1, 0, true);
    }
  }, [chapterIdx, fragmentIdx, chapter, chapters.length, navigateTo]);

  const goPrev = useCallback(() => {
    if (fragmentIdx > 0) {
      navigateTo(chapterIdx, fragmentIdx - 1, false);
    } else if (chapterIdx > 0) {
      const prev = chapters[chapterIdx - 1];
      navigateTo(chapterIdx - 1, prev.fragments.length - 1, true);
    }
  }, [chapterIdx, fragmentIdx, chapters, navigateTo]);

  const handleIndexNavigate = useCallback((ch: number, frag: number) => {
    setIsIndexOpen(false);
    navigateTo(ch, frag, ch !== chapterIdx);
  }, [chapterIdx, navigateTo]);

  // ── Cover actions ─────────────────────────────────────────
  const handleOpenFromStart = useCallback(() => {
    ensureAudio();
    setChapterIdx(0);
    setFragmentIdx(0);
    setView('reading');
  }, [ensureAudio]);

  const handleResume = useCallback(() => {
    ensureAudio();
    if (bookmark) {
      setChapterIdx(bookmark.chapterIndex);
      setFragmentIdx(bookmark.fragmentIndex);
    }
    setView('reading');
  }, [bookmark, ensureAudio]);

  // ── TTS ───────────────────────────────────────────────────
  const handleToggleTTS = useCallback(() => {
    if (isTTSPlaying) {
      stopSpeaking();
      setIsTTSPlaying(false);
    } else if (fragment) {
      const text = stripHtml(fragment.body);
      speak(text, VOICE_CONFIGS[selectedVoice], () => setIsTTSPlaying(false));
      setIsTTSPlaying(true);
    }
  }, [isTTSPlaying, fragment, selectedVoice]);

  // ── Downloads — serve the ORIGINAL file, untouched ────────
  const handleDownloadMD = useCallback(() => {
    const raw = rawMarkdownRef.current;
    if (!raw) return;
    const blob = new Blob([raw], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Numinia el juego de rol v0.0.9.md';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handlePrintPDF = useCallback(() => { window.print(); }, []);

  // ── Keyboard navigation ───────────────────────────────────
  useEffect(() => {
    if (view !== 'reading') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isIndexOpen) { if (e.key === 'Escape') setIsIndexOpen(false); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'Escape') { setView('cover'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isIndexOpen, goNext, goPrev]);

  // ── Touch swipe ───────────────────────────────────────────
  useEffect(() => {
    if (view !== 'reading') return;
    let startX = 0, startY = 0;
    const onStart = (e: TouchEvent) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goNext(); else goPrev();
      }
    };
    const el = scrollAreaRef.current;
    if (el) {
      el.addEventListener('touchstart', onStart, { passive: true });
      el.addEventListener('touchend', onEnd, { passive: true });
      return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
    }
  }, [view, goNext, goPrev]);

  // ── Auto-save bookmark ────────────────────────────────────
  useEffect(() => {
    if (view !== 'reading' || !chapters.length) return;
    const t = setTimeout(() => {
      saveBookmark({ chapterIndex: chapterIdx, fragmentIndex: fragmentIdx, scrollPosition: scrollAreaRef.current?.scrollTop ?? 0, timestamp: Date.now() });
    }, 500);
    return () => clearTimeout(t);
  }, [view, chapterIdx, fragmentIdx, saveBookmark, chapters.length]);

  // ── Loading / Error states ────────────────────────────────
  if (isLoading) {
    return (
      <div className="codex-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', color: '#c9a84c', animation: 'codex-pulse-glow 2s ease-in-out infinite' }}>&#x29DB;</div>
          <div style={{ fontFamily: 'serif', color: '#8a7333', letterSpacing: '0.2em', fontSize: '0.85rem', marginTop: '1rem' }}>Abriendo el Códice...</div>
        </div>
      </div>
    );
  }

  if (loadError || !chapters.length) {
    return (
      <div className="codex-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center', color: '#8a7333', fontFamily: 'serif' }}>
          <p>No se pudo cargar el Códice.</p>
          {loadError && <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{loadError}</p>}
        </div>
      </div>
    );
  }

  if (!chapter || !fragment) return null;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="codex-root">
      <AnimatePresence mode="wait">
        {view === 'cover' ? (
          <CodexCover
            key="cover"
            hasBookmark={!!bookmark}
            onOpen={handleOpenFromStart}
            onResume={handleResume}
          />
        ) : (
          <div key="reading" className="codex-viewport">
            <div className="codex-page-area" ref={scrollAreaRef}>
              <AnimatePresence mode="wait">
                <CodexPage
                  key={`${chapterIdx}-${fragmentIdx}`}
                  ref={pageRef}
                  fragment={fragment}
                  chapterTitle={chapter.title}
                  chapterNumber={chapter.number}
                  fragmentIndex={fragmentIdx}
                  totalFragments={chapter.fragments.length}
                  globalPageNumber={globalPageNumber}
                />
              </AnimatePresence>
            </div>

            <CodexNav
              currentPage={globalPageNumber}
              totalPages={totalPages}
              chapterTitle={chapter.title}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              isSoundEnabled={isSoundEnabled}
              isTTSPlaying={isTTSPlaying}
              selectedVoice={selectedVoice}
              onPrev={goPrev}
              onNext={goNext}
              onToggleIndex={() => setIsIndexOpen(!isIndexOpen)}
              onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
              onToggleTTS={handleToggleTTS}
              onVoiceChange={setSelectedVoice}
              onDownloadMD={handleDownloadMD}
              onPrintPDF={handlePrintPDF}
            />

            <CodexIndex
              isOpen={isIndexOpen}
              chapters={chapters}
              currentChapter={chapterIdx}
              currentFragment={fragmentIdx}
              onNavigate={handleIndexNavigate}
              onClose={() => setIsIndexOpen(false)}
            />

            <CodexMist
              isActive={isMistActive}
              variant={mistVariant}
              onComplete={handleMistComplete}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
