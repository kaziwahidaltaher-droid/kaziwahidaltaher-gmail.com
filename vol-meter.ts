export class VolumeMeter {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private dataArray: Uint8Array;
  private source: MediaStreamAudioSourceNode | null = null;
  private smoothing: number;

  constructor(smoothing = 0.8) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.smoothing = smoothing;
  }

  async connectToMic(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }

  getVolume(): number {
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    return parseFloat((average / 256).toFixed(3)); // Normalized 0.0–1.0
  }

  getSmoothedVolume(previous: number): number {
    const current = this.getVolume();
    return this.smoothing * previous + (1 - this.smoothing) * current;
  }

  disconnect(): void {
    if (this.source) {
      this.source.disconnect();
    }
    this.audioContext.close();
  }
}
