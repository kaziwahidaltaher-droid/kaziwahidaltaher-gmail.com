/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import type {MusicMood} from './index';

interface ActiveSound {
  stop: () => void;
}

@customElement('axee-audio-engine')
export class AxeeAudioEngine extends LitElement {
  @property({type: String}) mood: MusicMood = 'off';
  @property({type:Boolean}) muted = false;

  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null; // New node specifically for music
  private activeSound: ActiveSound | null = null;
  private currentMood: MusicMood = 'off';

  private initializeAudio() {
    if (this.audioContext) return;
    try {
      this.audioContext = new AudioContext();
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();

      // Music flows through musicGain -> masterGain -> destination
      this.musicGain.connect(this.masterGain);
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

    // Wait for the old sound's fade-out to complete before starting the new one.
    setTimeout(() => {
      // Ensure the mood hasn't changed again during the timeout
      if (this.currentMood !== this.mood) return;

      switch (this.mood) {
        case 'galaxy':
          this.activeSound = this.createGalaxySound();
          break;
        case 'serene':
          this.activeSound = this.createSereneSound();
          break;
        case 'tense':
          this.activeSound = this.createTenseSound();
          break;
        case 'mysterious':
          this.activeSound = this.createMysteriousSound();
          break;
      }
    }, 2100);
  }

  private createSound(
    oscillators: {type: OscillatorType; freq: number; detune?: number}[],
    lfo?: {freq: number; depth: number},
    volume = 0.1,
  ): ActiveSound {
    const actx = this.audioContext!;
    const nodes: (AudioNode | OscillatorNode)[] = [];
    const gain = actx.createGain();
    gain.gain.value = 0;
    // Background music connects to the musicGain node so it can be ducked
    gain.connect(this.musicGain!);
    gain.gain.linearRampToValueAtTime(volume, actx.currentTime + 2);

    oscillators.forEach((oscConfig) => {
      const osc = actx.createOscillator();
      osc.type = oscConfig.type;
      osc.frequency.value = oscConfig.freq;
      if (oscConfig.detune) {
        osc.detune.value = oscConfig.detune;
      }
      osc.connect(gain);
      osc.start();
      nodes.push(osc);
    });

    if (lfo) {
      const lfoOsc = actx.createOscillator();
      const lfoGain = actx.createGain();
      lfoOsc.type = 'sine';
      lfoOsc.frequency.value = lfo.freq;
      lfoGain.gain.value = lfo.depth;
      lfoOsc.connect(lfoGain);
      nodes.forEach((node) => {
        if (node instanceof OscillatorNode) {
          lfoGain.connect(node.frequency);
        }
      });
      lfoOsc.start();
      nodes.push(lfoOsc);
    }
    
    return {
        stop: () => {
            gain.gain.linearRampToValueAtTime(0, actx.currentTime + 2);
            setTimeout(() => {
                nodes.forEach(node => {
                    if (node instanceof OscillatorNode) {
                        node.stop();
                    }
                    node.disconnect();
                });
                gain.disconnect();
            }, 2100);
        }
    };
  }

  private createGalaxySound(): ActiveSound {
    return this.createSound(
      [
        {type: 'sine', freq: 60, detune: 0},
        {type: 'sine', freq: 62, detune: 2},
        {type: 'sawtooth', freq: 120, detune: -2},
      ],
      {freq: 0.05, depth: 20},
      0.08,
    );
  }

  private createSereneSound(): ActiveSound {
    return this.createSound(
      [
        {type: 'sine', freq: 100},
        {type: 'sine', freq: 202},
        {type: 'sine', freq: 305},
      ],
      {freq: 0.1, depth: 5},
      0.12,
    );
  }

  private createTenseSound(): ActiveSound {
    return this.createSound(
      [
        {type: 'sawtooth', freq: 55},
        {type: 'sawtooth', freq: 58, detune: 10},
      ],
      {freq: 2, depth: 5},
      0.07,
    );
  }

  private createMysteriousSound(): ActiveSound {
    return this.createSound(
      [
        {type: 'square', freq: 80},
        {type: 'sine', freq: 165, detune: 5},
      ],
      {freq: 0.2, depth: 15},
      0.09,
    );
  }

  // --- PUBLIC METHODS FOR SFX & CONTROL ---

  // FIX: Implement method to duck music volume.
  public duck(isDucked: boolean) {
    if (!this.musicGain || !this.audioContext) return;
    const targetGain = isDucked ? 0.2 : 1.0;
    this.musicGain.gain.linearRampToValueAtTime(
      targetGain,
      this.audioContext.currentTime + 0.5,
    );
  }

  // Fix: Add a generic sound effect player.
  private playSfx(
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume = 0.3,
  ) {
    if (!this.audioContext || !this.masterGain) {
      if (!this.audioContext) this.initializeAudio();
      if (!this.audioContext || !this.masterGain) return;
    }

    const actx = this.audioContext;
    const now = actx.currentTime;

    const osc = actx.createOscillator();
    const gain = actx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    // SFX connect to masterGain directly to bypass music ducking
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Fix: Add all the missing sound effect methods.
  public playInteractionSound() {
    this.playSfx('sine', 880, 440, 0.1, 0.2);
  }

  public playSuccessSound() {
    this.playSfx('sine', 523.25, 1046.5, 0.2, 0.3);
  }

  public playErrorSound() {
    this.playSfx('sawtooth', 220, 110, 0.3, 0.2);
  }

  public playJumpEngageSound() {
    this.playSfx('sawtooth', 50, 200, 1.0, 0.4);
  }

  public playClearSound() {
    this.playSfx('sine', 2000, 100, 0.5, 0.2);
  }

  public playToggleSound() {
    this.playSfx('triangle', 1200, 1200, 0.05, 0.15);
  }

  public playHoverSound() {
    this.playSfx('sine', 1500, 1500, 0.03, 0.05);
  }
}
