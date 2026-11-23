/**
 * Web Audio API synthesizer for study ambient sounds and timer chime.
 * Completely self-contained, no external mp3 files required.
 */

class StudyAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isAmbientPlaying: boolean = false;
  private currentType: string = 'none';

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Play clean timer chime bell (positive completion tone)
   */
  playChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now); // D6
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.4);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  /**
   * Start ambient study sound: 'rain', 'binaural', 'whitenoise'
   */
  startAmbient(type: 'rain' | 'binaural' | 'whitenoise') {
    this.stopAmbient();
    try {
      this.initCtx();
      if (!this.ctx) return;

      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === 'rain' || type === 'whitenoise') {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Pink / Brown filter for soft rain / soothing static
          if (type === 'rain') {
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= 3.5;
          } else {
            output[i] = white * 0.15;
          }
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
        filter.frequency.value = type === 'rain' ? 800 : 1200;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.08;

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start();
        this.noiseNode = whiteNoise;
        this.gainNode = gain;
      } else if (type === 'binaural') {
        // Binaural focus beats: 216Hz and 226Hz (10Hz Alpha flow state beat)
        const oscLeft = this.ctx.createOscillator();
        const oscRight = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        oscLeft.type = 'sine';
        oscLeft.frequency.value = 216;
        oscRight.type = 'sine';
        oscRight.frequency.value = 226;

        gain.gain.value = 0.06;

        oscLeft.connect(gain);
        oscRight.connect(gain);
        gain.connect(this.ctx.destination);

        oscLeft.start();
        oscRight.start();

        this.noiseNode = oscLeft;
        this.gainNode = gain;
      }

      this.isAmbientPlaying = true;
      this.currentType = type;
    } catch (e) {
      console.warn('Ambient audio error:', e);
    }
  }

  stopAmbient() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as any).stop?.();
        this.noiseNode.disconnect();
      } catch (e) {}
      this.noiseNode = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (e) {}
      this.gainNode = null;
    }
    this.isAmbientPlaying = false;
    this.currentType = 'none';
  }

  isPlaying() {
    return this.isAmbientPlaying;
  }

  getCurrentType() {
    return this.currentType;
  }
}

export const soundFx = new StudyAudioSynthesizer();
