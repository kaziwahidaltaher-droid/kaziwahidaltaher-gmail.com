/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import type {MusicMood} from './index.js';

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
    gain.connect(this.masterGain!);
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
      nodes.push(lfoOsc, lfoGain);
    }

    const stop = () => {
      gain.gain.linearRampToValueAtTime(0, actx.currentTime + 2);
      setTimeout(() => {
        nodes.forEach((node) => {
          if (node instanceof OscillatorNode) node.stop();
          node.disconnect();
        });
      }, 2100);
    };

    return {stop};
  }

  private createGalaxySound = () =>
    this.createSound(
      [{type: 'sine', freq: 40}],
      {freq: 0.1, depth: 5},
      0.2,
    );
  private createSereneSound = () =>
    this.createSound(
      [
        {type: 'sine', freq: 100, detune: -2},
        {type: 'triangle', freq: 200, detune: 2},
      ],
      {freq: 0.2, depth: 3},
      0.15,
    );
  private createTenseSound = () =>
    this.createSound(
      [
        {type: 'sawtooth', freq: 60},
        {type: 'square', freq: 61},
      ],
      {freq: 0.5, depth: 2},
      0.1,
    );
  private createMysteriousSound = () =>
    this.createSound(
      [
        {type: 'triangle', freq: 220},
        {type: 'sine', freq: 440, detune: 5},
      ],
      {freq: 0.05, depth: 10},
      0.1,
    );

  public playInteractionSound() {
    this.initializeAudio();
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSuccessSound() {
    this.initializeAudio();
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;

    const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const gain = this.audioContext.createGain();
    gain.gain.value = 0.2;
    gain.connect(this.masterGain);

    frequencies.forEach((freq, index) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startTime = now + index * 0.08;
      osc.connect(gain);
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    });
  }

  public playErrorSound() {
    this.initializeAudio();
    if (!this.audioContext || !this.masterGain) return;
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  createRenderRoot() {
    return this;
  }
}