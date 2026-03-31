'use client';

import type { VoiceConfig } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip HTML tags so only plain text is sent to the speech engine. */
export function stripHtml(html: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return el.textContent ?? '';
  }
  // Fallback regex for environments without DOM (SSR, tests).
  return html.replace(/<[^>]*>/g, '');
}

// ---------------------------------------------------------------------------
// Voice loading
// ---------------------------------------------------------------------------

/**
 * Resolve the available SpeechSynthesis voices.
 *
 * Some browsers populate the voice list synchronously while others fire
 * `voiceschanged` asynchronously. This helper handles both cases.
 */
export function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve([]);
      return;
    }

    const synth = window.speechSynthesis;
    const voices = synth.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Wait for the browser to load voices asynchronously.
    const onVoicesChanged = () => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', onVoicesChanged);
  });
}

// ---------------------------------------------------------------------------
// Playback controls
// ---------------------------------------------------------------------------

/**
 * Speak the given text using the Web Speech API with the supplied voice
 * configuration. Returns the utterance so callers can attach additional
 * event listeners, or `null` if speech synthesis is unavailable.
 */
export function speak(
  text: string,
  voiceConfig: VoiceConfig,
  onEnd?: () => void,
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  // Cancel anything currently playing before starting a new utterance.
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = voiceConfig.pitch;
  utterance.rate = voiceConfig.rate;

  if (onEnd) {
    utterance.addEventListener('end', onEnd);
    utterance.addEventListener('error', onEnd);
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/** Stop all speech and clear the utterance queue. */
export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
}

/** Pause the current utterance. */
export function pauseSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.pause();
}

/** Resume a paused utterance. */
export function resumeSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.resume();
}

/** Returns `true` when the speech engine is currently speaking. */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  return window.speechSynthesis.speaking;
}
