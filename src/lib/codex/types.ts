/**
 * Core types for the Numinia Codex interactive book reader.
 */

// ---------------------------------------------------------------------------
// Content types
// ---------------------------------------------------------------------------

export interface CodexFragment {
  id: string;
  title: string;
  body: string;
  illustration?: string;
}

export interface CodexChapter {
  id: string;
  number: number | null;
  title: string;
  subtitle?: string;
  epigraph?: string;
  fragments: CodexFragment[];
}

// ---------------------------------------------------------------------------
// Bookmark
// ---------------------------------------------------------------------------

export interface CodexBookmark {
  chapterIndex: number;
  fragmentIndex: number;
  scrollPosition: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Voice / TTS
// ---------------------------------------------------------------------------

export type VoicePreset = 'masculine' | 'feminine' | 'androgynous';

export interface VoiceConfig {
  preset: VoicePreset;
  label: string;
  description: string;
  icon: string;
  pitch: number;
  rate: number;
}

export const VOICE_CONFIGS: Record<VoicePreset, VoiceConfig> = {
  masculine: {
    preset: 'masculine',
    label: 'Voz Profunda y Dramática',
    description: 'A deep, dramatic reading voice.',
    icon: '🗣️',
    pitch: 0.7,
    rate: 0.85,
  },
  feminine: {
    preset: 'feminine',
    label: 'Voz Dulce y Grave',
    description: 'A sweet, low-pitched reading voice.',
    icon: '✦',
    pitch: 1.3,
    rate: 0.9,
  },
  androgynous: {
    preset: 'androgynous',
    label: 'Voz Espectral',
    description: 'A spectral, other-worldly reading voice.',
    icon: '◈',
    pitch: 1.0,
    rate: 0.78,
  },
};
