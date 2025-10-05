export class AudioAnalyser {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: MediaStreamAudioSourceNode | null = null;
  private frequencyData: Uint8Array;
  private waveformData: Uint8Array;

  constructor(fftSize = 512) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveformData = new Uint8Array(this.analyser.fftSize);
  }

  async connect(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  getWaveformData(): Uint8Array {
    this.analyser.getByteTimeDomainData(this.waveformData);
    return this.waveformData;
  }

  getAverageVolume(): number {
    this.analyser.getByteFrequencyData(this.frequencyData);
    const sum = this.frequencyData.reduce((a, b) => a + b, 0);
    return parseFloat((sum / this.frequencyData.length / 256).toFixed(3)); // normalized 0–1
  }

  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
    }
    this.audioContext.close();
  }
}
