'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { codexChapters, totalFragments } from '@/lib/codex/content';
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

type CodexView = 'cover' | 'reading';

export function CodexReader() {
  // ── State ─────────────────────────────────────────────────
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

  // ── Refs ──────────────────────────────────────────────────
  const audioRef = useRef<CodexAudio | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // ── Bookmark ──────────────────────────────────────────────
  const { bookmark, saveBookmark, clearBookmark } = useBookmark();

  // ── Derived ───────────────────────────────────────────────
  const chapter = codexChapters[chapterIdx];
  const fragment = chapter?.fragments[fragmentIdx];

  const globalPageNumber = useMemo(() => {
    let page = 0;
    for (let i = 0; i < chapterIdx; i++) {
      page += codexChapters[i].fragments.length;
    }
    return page + fragmentIdx + 1;
  }, [chapterIdx, fragmentIdx]);

  const canGoPrev = chapterIdx > 0 || fragmentIdx > 0;
  const canGoNext = chapterIdx < codexChapters.length - 1 || fragmentIdx < chapter.fragments.length - 1;

  // ── Audio init ────────────────────────────────────────────
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new CodexAudio();
    }
    audioRef.current.init();
    return audioRef.current;
  }, []);

  // ── Navigation helpers ────────────────────────────────────
  const scrollToTop = useCallback(() => {
    scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const navigateTo = useCallback((ch: number, frag: number, isChapterChange: boolean) => {
    if (isChapterChange) {
      // Play chapter transition
      const variants: Array<'light' | 'aqueous' | 'deep'> = ['light', 'aqueous', 'deep'];
      setMistVariant(variants[Math.floor(Math.random() * variants.length)]);
      setIsMistActive(true);
      setPendingNavigation({ ch, frag });

      if (isSoundEnabled) {
        try { ensureAudio().playChapterTransition(); } catch {}
      }
    } else {
      // Simple page turn
      setChapterIdx(ch);
      setFragmentIdx(frag);
      scrollToTop();

      if (isSoundEnabled) {
        try { ensureAudio().playPageTurn(); } catch {}
      }
    }

    // Stop TTS on navigation
    if (isTTSPlaying) {
      stopSpeaking();
      setIsTTSPlaying(false);
    }
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
    if (fragmentIdx < chapter.fragments.length - 1) {
      navigateTo(chapterIdx, fragmentIdx + 1, false);
    } else if (chapterIdx < codexChapters.length - 1) {
      navigateTo(chapterIdx + 1, 0, true);
    }
  }, [chapterIdx, fragmentIdx, chapter, navigateTo]);

  const goPrev = useCallback(() => {
    if (fragmentIdx > 0) {
      navigateTo(chapterIdx, fragmentIdx - 1, false);
    } else if (chapterIdx > 0) {
      const prevChapter = codexChapters[chapterIdx - 1];
      navigateTo(chapterIdx - 1, prevChapter.fragments.length - 1, true);
    }
  }, [chapterIdx, fragmentIdx, navigateTo]);

  const handleIndexNavigate = useCallback((ch: number, frag: number) => {
    const isChapterChange = ch !== chapterIdx;
    setIsIndexOpen(false);
    navigateTo(ch, frag, isChapterChange);
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
      const config = VOICE_CONFIGS[selectedVoice];
      speak(text, config, () => setIsTTSPlaying(false));
      setIsTTSPlaying(true);
    }
  }, [isTTSPlaying, fragment, selectedVoice]);

  // ── Downloads ─────────────────────────────────────────────
  const handleDownloadMD = useCallback(() => {
    let md = '';
    for (const ch of codexChapters) {
      const header = ch.number !== null ? `# Capítulo ${ch.number}: ${ch.title}` : `# ${ch.title}`;
      md += `${header}\n\n`;
      if (ch.subtitle) md += `*${ch.subtitle}*\n\n`;
      for (const frag of ch.fragments) {
        md += `## ${frag.title}\n\n`;
        // Strip HTML and convert to markdown-ish
        const text = frag.body
          .replace(/<h3>/g, '### ')
          .replace(/<\/h3>/g, '\n\n')
          .replace(/<h4>/g, '#### ')
          .replace(/<\/h4>/g, '\n\n')
          .replace(/<p>/g, '')
          .replace(/<\/p>/g, '\n\n')
          .replace(/<em>/g, '*')
          .replace(/<\/em>/g, '*')
          .replace(/<strong>/g, '**')
          .replace(/<\/strong>/g, '**')
          .replace(/<blockquote>/g, '> ')
          .replace(/<\/blockquote>/g, '\n\n')
          .replace(/<br\s*\/?>/g, '\n')
          .replace(/<li>/g, '- ')
          .replace(/<\/li>/g, '\n')
          .replace(/<\/?[^>]+(>|$)/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        md += `${text}\n\n---\n\n`;
      }
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'numinia-rpg-codice-de-las-brumas.md';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handlePrintPDF = useCallback(() => {
    window.print();
  }, []);

  // ── Keyboard navigation ───────────────────────────────────
  useEffect(() => {
    if (view !== 'reading') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isIndexOpen) {
        if (e.key === 'Escape') setIsIndexOpen(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        setView('cover');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, isIndexOpen, goNext, goPrev]);

  // ── Touch swipe ───────────────────────────────────────────
  useEffect(() => {
    if (view !== 'reading') return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;

      // Only trigger on horizontal swipes
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) goNext();
        else goPrev();
      }
    };

    const el = scrollAreaRef.current;
    if (el) {
      el.addEventListener('touchstart', handleTouchStart, { passive: true });
      el.addEventListener('touchend', handleTouchEnd, { passive: true });
      return () => {
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [view, goNext, goPrev]);

  // ── Auto-save bookmark ────────────────────────────────────
  useEffect(() => {
    if (view !== 'reading') return;

    const timeout = setTimeout(() => {
      saveBookmark({
        chapterIndex: chapterIdx,
        fragmentIndex: fragmentIdx,
        scrollPosition: scrollAreaRef.current?.scrollTop ?? 0,
        timestamp: Date.now(),
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [view, chapterIdx, fragmentIdx, saveBookmark]);

  // ── Close menus on outside click ──────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.codex-tts-panel') && !target.closest('.codex-dl-menu') && !target.closest('.relative')) {
        // Menus are handled internally by CodexNav
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ── Render ────────────────────────────────────────────────
  if (!chapter || !fragment) return null;

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
            {/* Page area */}
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

            {/* Navigation */}
            <CodexNav
              currentPage={globalPageNumber}
              totalPages={totalFragments}
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

            {/* Index panel */}
            <CodexIndex
              isOpen={isIndexOpen}
              chapters={codexChapters}
              currentChapter={chapterIdx}
              currentFragment={fragmentIdx}
              onNavigate={handleIndexNavigate}
              onClose={() => setIsIndexOpen(false)}
            />

            {/* Mist transition */}
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
