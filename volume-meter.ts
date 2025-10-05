/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class VolumeMeter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private smoothing: number;
  private animationFrameId: number | null = null;
  private onVolumeChange: (volume: number) => void;
  private smoothedVolume = 0;

  constructor(onVolumeChange: (volume: number) => void, smoothing = 0.8) {
    this.onVolumeChange = onVolumeChange;
    this.smoothing = smoothing;
  }

  public async connect(): Promise<void> {
    if (this.audioContext) return; // Already connected
    try {
      this.audioContext = new AudioContext();
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.source.connect(this.analyser);
      this.startPolling();
    } catch (err) {
      console.error('Error connecting to microphone:', err);
      throw new Error('Microphone access was denied or failed.');
    }
  }

  private startPolling = () => {
    if (!this.analyser || !this.dataArray) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    const currentVolume = average / 256.0; // Normalize to 0-1

    this.smoothedVolume = this.smoothing * this.smoothedVolume + (1 - this.smoothing) * currentVolume;
    
    this.onVolumeChange(this.smoothedVolume);
    
    this.animationFrameId = requestAnimationFrame(this.startPolling);
  }

  public disconnect(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.smoothedVolume = 0;
  }
}