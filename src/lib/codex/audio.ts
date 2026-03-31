/**
 * Web Audio API engine for the Numinia Codex.
 *
 * Produces synthesised sound effects (page turn, chapter transition) so the
 * reader experience feels tactile without shipping audio files.
 */

export class CodexAudio {
  private audioCtx: AudioContext | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Create (or resume) an AudioContext. Call on first user gesture. */
  init(): void {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /** Release all audio resources. */
  dispose(): void {
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Sound effects
  // ---------------------------------------------------------------------------

  /**
   * Short (~400 ms) paper-rustle + wind burst.
   *
   * Pink-ish noise is pushed through a lowpass filter whose frequency sweeps
   * downward, giving the impression of a page turning. A subtle high-frequency
   * shimmer is layered on top for texture.
   */
  playPageTurn(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const duration = 0.4;

    // --- Noise source (pink-ish) -----------------------------------------
    const noiseBuffer = this.createNoiseBuffer(ctx, duration, 'pink');
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    // Lowpass filter with a downward frequency sweep
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(4000, now);
    lowpass.frequency.exponentialRampToValueAtTime(300, now + duration);
    lowpass.Q.value = 1.0;

    // Gain envelope
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.linearRampToValueAtTime(0.0, now + duration);

    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // --- Shimmer layer ---------------------------------------------------
    const shimmerBuffer = this.createNoiseBuffer(ctx, duration * 0.6, 'white');
    const shimmerSource = ctx.createBufferSource();
    shimmerSource.buffer = shimmerBuffer;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 6000;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.05, now);
    shimmerGain.gain.linearRampToValueAtTime(0.0, now + duration * 0.6);

    shimmerSource.connect(highpass);
    highpass.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    // --- Play ------------------------------------------------------------
    noiseSource.start(now);
    noiseSource.stop(now + duration);
    shimmerSource.start(now);
    shimmerSource.stop(now + duration * 0.6);
  }

  /**
   * Longer (~2 s) atmospheric chapter-transition sound.
   *
   * Layers:
   *  1. Bandpass-filtered noise (wind/atmosphere)
   *  2. Low sine-wave drone
   *  3. Ethereal high-frequency shimmer with stereo spread
   */
  playChapterTransition(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const duration = 2.0;

    // --- Atmospheric noise -----------------------------------------------
    const atmoBuffer = this.createNoiseBuffer(ctx, duration, 'pink');
    const atmoSource = ctx.createBufferSource();
    atmoSource.buffer = atmoBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(800, now);
    bandpass.frequency.linearRampToValueAtTime(400, now + duration);
    bandpass.Q.value = 2.0;

    const atmoGain = ctx.createGain();
    atmoGain.gain.setValueAtTime(0.0, now);
    atmoGain.gain.linearRampToValueAtTime(0.3, now + 0.3);
    atmoGain.gain.setValueAtTime(0.3, now + duration - 0.6);
    atmoGain.gain.linearRampToValueAtTime(0.0, now + duration);

    atmoSource.connect(bandpass);
    bandpass.connect(atmoGain);
    atmoGain.connect(ctx.destination);

    // --- Low drone -------------------------------------------------------
    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.setValueAtTime(70, now);
    drone.frequency.linearRampToValueAtTime(55, now + duration);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0, now);
    droneGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
    droneGain.gain.setValueAtTime(0.12, now + duration - 0.5);
    droneGain.gain.linearRampToValueAtTime(0.0, now + duration);

    drone.connect(droneGain);
    droneGain.connect(ctx.destination);

    // --- Stereo shimmer --------------------------------------------------
    const shimmerDuration = duration * 0.7;
    const shimmerBuffer = this.createStereoNoiseBuffer(ctx, shimmerDuration);
    const shimmerSource = ctx.createBufferSource();
    shimmerSource.buffer = shimmerBuffer;

    const shimmerHighpass = ctx.createBiquadFilter();
    shimmerHighpass.type = 'highpass';
    shimmerHighpass.frequency.value = 5000;

    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0.0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.08, now + 0.6);
    shimmerGain.gain.setValueAtTime(0.08, now + shimmerDuration - 0.4);
    shimmerGain.gain.linearRampToValueAtTime(0.0, now + shimmerDuration);

    shimmerSource.connect(shimmerHighpass);
    shimmerHighpass.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    // --- Play all layers -------------------------------------------------
    atmoSource.start(now);
    atmoSource.stop(now + duration);
    drone.start(now);
    drone.stop(now + duration);
    shimmerSource.start(now + 0.2);
    shimmerSource.stop(now + 0.2 + shimmerDuration);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Generate a mono noise buffer.
   * `type` controls spectral shape:
   *  - 'white': flat spectrum
   *  - 'pink':  -3 dB/octave roll-off (approximated via Paul Kellet's method)
   */
  private createNoiseBuffer(
    ctx: AudioContext,
    seconds: number,
    type: 'white' | 'pink',
  ): AudioBuffer {
    const length = Math.ceil(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else {
      // Paul Kellet's pink noise approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }

    return buffer;
  }

  /**
   * Generate a stereo noise buffer with decorrelated channels for spatial width.
   */
  private createStereoNoiseBuffer(
    ctx: AudioContext,
    seconds: number,
  ): AudioBuffer {
    const length = Math.ceil(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      left[i] = Math.random() * 2 - 1;
      right[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}
