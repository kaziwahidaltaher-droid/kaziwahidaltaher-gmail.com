/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import type {MusicMood} from './index.tsx';

interface ActiveSound {
  stop: () => void;
}

@customElement('axee-audio-engine')
export class AxeeAudioEngine extends LitElement {
  @property({type: String}) mood: MusicMood = 'off';
  @property({type:Boolean}) muted = false;

  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSound: ActiveSound | null = null;
  private currentMood: MusicMood = 'off';

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
      this.audioContext.currentTime + 1,
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
      this.activeSound.stop();
      this.activeSound = null;
    }

    this.currentMood = this.mood;

    if (this.mood === 'off') return;

    setTimeout(() => {
      if (this.mood !== this.currentMood || !this.audioContext) return;

      if (this.mood === 'galaxy') this.playGalaxyDrone();
      else if (this.mood === 'serene') this.playSerenePad();
      else if (this.mood === 'tense') this.playTenseAmbience();
      else if (this.mood === 'mysterious') this.playMysteriousChimes();
    }, 1000); // 1-second crossfade
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

  // NOTE: Dummy implementations for music methods called in changeMood.
  // The original file content seems incomplete.
  private playGalaxyDrone() {
    /* placeholder */
  }
  private playSerenePad() {
    /* placeholder */
  }
  private playTenseAmbience() {
    /* placeholder */
  }
  private playMysteriousChimes() {
    /* placeholder */
  }
}
