/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import type {MusicMood} from './index.tsx';

interface ActiveSound {
  gainNode: GainNode;
  stop: () => void;
}

@customElement('axee-audio-engine')
export class AxeeAudioEngine extends LitElement {
  @property({type: String}) mood: MusicMood = 'off';
  @property({type: Boolean}) muted = false;

  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSound: ActiveSound | null = null;
  private currentMood: MusicMood = 'off';
  private readonly FADE_TIME = 2.0;

  private initializeAudio() {
    if (this.audioContext) return;
    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.updateMasterGain();
      console.log('Audio Engine Initialized.');
    } catch (e) {
      console.error('Web Audio API is not supported in this browser.', e);
    }
  }

  private updateMasterGain() {
    if (!this.masterGain || !this.audioContext) return;
    const targetGain = this.muted ? 0 : 1;
    this.masterGain.gain.linearRampToValueAtTime(
      targetGain,
      this.audioContext.currentTime + this.FADE_TIME / 2,
    );
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('muted')) {
      this.updateMasterGain();
    }

    if (changedProperties.has('mood') && this.currentMood !== this.mood) {
      if (this.mood !== 'off' && !this.audioContext) {
        this.initializeAudio();
      }
      this.changeMood();
    }
  }

  private changeMood() {
    if (!this.audioContext) {
      return;
    }

    if (this.activeSound) {
      const now = this.audioContext.currentTime;
      this.activeSound.gainNode.gain.linearRampToValueAtTime(
        0.0001,
        now + this.FADE_TIME,
      );
      this.activeSound.stop();
      this.activeSound = null;
    }

    this.currentMood = this.mood;

    if (this.mood === 'off') return;

    // Start new sound halfway through the fade out of the old one
    setTimeout(() => {
      if (this.mood !== this.currentMood || !this.audioContext) return;

      if (this.mood === 'galaxy') this.activeSound = this.playGalaxyDrone();
      else if (this.mood === 'serene') this.activeSound = this.playSerenePad();
      else if (this.mood === 'tense')
        this.activeSound = this.playTenseAmbience();
      else if (this.mood === 'mysterious')
        this.activeSound = this.playMysteriousChimes();
    }, this.FADE_TIME * 1000 * 0.5);
  }

  // FIX: Add sound effect methods to resolve errors in index.tsx
  public playInteractionSound() {
    this.playSoundEffect('sine', 880, 0.1, 0.02);
  }

  public playSuccessSound() {
    this.playSoundEffect('triangle', 523.25, 0.2, 0.05, 1046.5);
  }

  public playErrorSound() {
    this.playSoundEffect('sawtooth', 220, 0.3, 0.03, 110);
  }

  private playSoundEffect(
    type: OscillatorType,
    startFreq: number,
    duration: number,
    gainValue: number,
    endFreq?: number,
  ) {
    this.initializeAudio();
    if (!this.audioContext || !this.masterGain) {
      return;
    }

    const now = this.audioContext.currentTime;
    const effectGain = this.audioContext.createGain();
    effectGain.connect(this.masterGain);
    effectGain.gain.setValueAtTime(gainValue, now);
    effectGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    const oscillator = this.audioContext.createOscillator();
    oscillator.connect(effectGain);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFreq, now);
    if (endFreq) {
      oscillator.frequency.exponentialRampToValueAtTime(
        endFreq,
        now + duration * 0.8,
      );
    }

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private playGalaxyDrone(): ActiveSound | null {
    if (!this.audioContext || !this.masterGain) return null;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const moodGain = ctx.createGain();
    moodGain.gain.setValueAtTime(0, now);
    moodGain.gain.linearRampToValueAtTime(0.15, now + this.FADE_TIME);
    moodGain.connect(this.masterGain);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, now); // Low hum
    osc1.connect(moodGain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(61, now); // Slight detune for texture
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.2;
    osc2.connect(osc2Gain).connect(moodGain);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05; // Very slow modulation
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(moodGain.gain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    return {
      gainNode: moodGain,
      stop: () => {
        const stopTime = ctx.currentTime + this.FADE_TIME;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        lfo.stop(stopTime);
        setTimeout(() => moodGain.disconnect(), this.FADE_TIME * 1000 + 100);
      },
    };
  }

  private playSerenePad(): ActiveSound | null {
    if (!this.audioContext || !this.masterGain) return null;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const moodGain = ctx.createGain();
    moodGain.gain.setValueAtTime(0, now);
    moodGain.gain.linearRampToValueAtTime(0.1, now + this.FADE_TIME);
    moodGain.connect(this.masterGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 8;
    filter.connect(moodGain);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 220; // A3
    osc1.detune.value = -4;
    osc1.connect(filter);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 220;
    osc2.detune.value = 4;
    osc2.connect(filter);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 150; // Affects filter frequency
    lfo.connect(lfoGain).connect(filter.frequency);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    return {
      gainNode: moodGain,
      stop: () => {
        const stopTime = ctx.currentTime + this.FADE_TIME;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        lfo.stop(stopTime);
        setTimeout(() => moodGain.disconnect(), this.FADE_TIME * 1000 + 100);
      },
    };
  }

  private playTenseAmbience(): ActiveSound | null {
    if (!this.audioContext || !this.masterGain) return null;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const moodGain = ctx.createGain();
    moodGain.gain.setValueAtTime(0, now);
    moodGain.gain.linearRampToValueAtTime(0.08, now + this.FADE_TIME);
    moodGain.connect(this.masterGain);

    const osc1 = ctx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.value = 110;
    osc1.connect(moodGain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 111.2; // Dissonance
    osc2.connect(moodGain);

    return {
      gainNode: moodGain,
      stop: () => {
        const stopTime = ctx.currentTime + this.FADE_TIME;
        osc1.stop(stopTime);
        osc2.stop(stopTime);
        setTimeout(() => moodGain.disconnect(), this.FADE_TIME * 1000 + 100);
      },
    };
  }

  private playMysteriousChimes(): ActiveSound | null {
    if (!this.audioContext || !this.masterGain) return null;
    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const moodGain = ctx.createGain();
    moodGain.gain.setValueAtTime(0, now);
    moodGain.gain.linearRampToValueAtTime(0.2, now + this.FADE_TIME);
    moodGain.connect(this.masterGain);

    const delay = ctx.createDelay(5.0);
    delay.delayTime.value = 0.45;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.7;
    delay.connect(feedback);
    feedback.connect(delay);
    moodGain.connect(delay);
    delay.connect(this.masterGain); // Connect delay output to master as well

    const notes = [523.25, 659.25, 783.99, 1046.5, 349.23]; // C5, E5, G5, C6, F4
    const interval = setInterval(() => {
      if (!this.audioContext) {
        clearInterval(interval);
        return;
      }
      const chimeNow = this.audioContext.currentTime;
      const note = notes[Math.floor(Math.random() * notes.length)];
      const chimeGain = this.audioContext.createGain();
      chimeGain.gain.setValueAtTime(0.3, chimeNow);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeNow + 4.0);
      chimeGain.connect(moodGain);

      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note;
      osc.connect(chimeGain);
      osc.start(chimeNow);
      osc.stop(chimeNow + 4.0);
    }, 4500);

    return {
      gainNode: moodGain,
      stop: () => {
        clearInterval(interval);
        setTimeout(() => {
          moodGain.disconnect();
          delay.disconnect();
          feedback.disconnect();
        }, this.FADE_TIME * 1000 + 100);
      },
    };
  }
}
