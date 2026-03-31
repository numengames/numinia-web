'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Volume2, VolumeX, Download, Mic } from 'lucide-react';
import type { VoicePreset } from '@/lib/codex/types';
import { VOICE_CONFIGS } from '@/lib/codex/types';

interface CodexNavProps {
  currentPage: number;
  totalPages: number;
  chapterTitle: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  isSoundEnabled: boolean;
  isTTSPlaying: boolean;
  selectedVoice: VoicePreset;
  onPrev: () => void;
  onNext: () => void;
  onToggleIndex: () => void;
  onToggleSound: () => void;
  onToggleTTS: () => void;
  onVoiceChange: (voice: VoicePreset) => void;
  onDownloadMD: () => void;
  onPrintPDF: () => void;
}

export function CodexNav({
  currentPage,
  totalPages,
  chapterTitle,
  canGoPrev,
  canGoNext,
  isSoundEnabled,
  isTTSPlaying,
  selectedVoice,
  onPrev,
  onNext,
  onToggleIndex,
  onToggleSound,
  onToggleTTS,
  onVoiceChange,
  onDownloadMD,
  onPrintPDF,
}: CodexNavProps) {
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showDlMenu, setShowDlMenu] = useState(false);

  return (
    <>
      {/* Index trigger button (lower left, above nav) */}
      <div className="codex-index-trigger">
        <button
          className="codex-icon-btn codex-tooltip"
          onClick={onToggleIndex}
          aria-label="Abrir índice"
          data-tooltip="Índice"
        >
          <BookOpen size={15} />
        </button>
      </div>

      {/* TTS controls (top right) */}
      <div className="codex-tts-panel">
        {/* Voice selector */}
        <div className="relative">
          <button
            className={`codex-icon-btn ${showVoiceMenu ? 'active' : ''}`}
            onClick={() => setShowVoiceMenu(!showVoiceMenu)}
            aria-label="Seleccionar voz"
          >
            <Mic size={14} />
          </button>

          {showVoiceMenu && (
            <div className="codex-tts-menu">
              {(Object.keys(VOICE_CONFIGS) as VoicePreset[]).map((preset) => (
                <button
                  key={preset}
                  className={`codex-tts-option ${selectedVoice === preset ? 'selected' : ''}`}
                  onClick={() => {
                    onVoiceChange(preset);
                    setShowVoiceMenu(false);
                  }}
                >
                  <span>{VOICE_CONFIGS[preset].icon}</span>
                  <span>{VOICE_CONFIGS[preset].label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TTS play/stop */}
        <button
          className={`codex-icon-btn ${isTTSPlaying ? 'active' : ''}`}
          onClick={onToggleTTS}
          aria-label={isTTSPlaying ? 'Detener lectura' : 'Leer en voz alta'}
        >
          {isTTSPlaying ? '⏹' : '▶'}
        </button>
      </div>

      {/* Bottom navigation bar */}
      <nav className="codex-nav" aria-label="Navegación del códice">
        {/* Prev */}
        <button
          className="codex-nav-btn"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {/* Center indicator */}
        <div className="codex-nav-indicator">
          {currentPage} / {totalPages}
        </div>

        {/* Right controls */}
        <div className="codex-nav-controls">
          {/* Sound toggle */}
          <button
            className={`codex-icon-btn ${isSoundEnabled ? 'active' : ''}`}
            onClick={onToggleSound}
            aria-label={isSoundEnabled ? 'Silenciar' : 'Activar sonido'}
          >
            {isSoundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Download */}
          <div className="relative">
            <button
              className={`codex-icon-btn ${showDlMenu ? 'active' : ''}`}
              onClick={() => setShowDlMenu(!showDlMenu)}
              aria-label="Descargar"
            >
              <Download size={14} />
            </button>

            {showDlMenu && (
              <div className="codex-dl-menu">
                <button
                  className="codex-dl-option"
                  onClick={() => { onDownloadMD(); setShowDlMenu(false); }}
                >
                  <span>📝</span> Descargar Markdown
                </button>
                <button
                  className="codex-dl-option"
                  onClick={() => { onPrintPDF(); setShowDlMenu(false); }}
                >
                  <span>📄</span> Imprimir como PDF
                </button>
              </div>
            )}
          </div>

          {/* Next */}
          <button
            className="codex-nav-btn"
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </nav>
    </>
  );
}
