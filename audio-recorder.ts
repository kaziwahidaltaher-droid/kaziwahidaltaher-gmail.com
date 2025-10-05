export class AudioRecorder {
  private audioContext: AudioContext;
  private recorderNode: AudioWorkletNode | null = null;
  private isReady: boolean = false;

  constructor() {
    this.audioContext = new AudioContext();
  }

  async initialize(workletURL: string): Promise<void> {
    await this.audioContext.audioWorklet.addModule(workletURL);
    this.recorderNode = new AudioWorkletNode(this.audioContext, 'audio-recorder-processor');
    this.isReady = true;
  }

  async connect(): Promise<void> {
    if (!this.isReady || !this.recorderNode) {
      throw new Error('AudioRecorder not initialized');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.recorderNode);
  }

  onFrame(callback: (samples: number[]) => void): void {
    if (!this.recorderNode) return;
    this.recorderNode.port.onmessage = (event) => {
      const { type, samples } = event.data;
      if (type === 'audio-frame') {
        callback(samples);
      }
    };
  }

  disconnect(): void {
    if (this.recorderNode) {
      this.recorderNode.disconnect();
      this.recorderNode.port.onmessage = null;
    }
    this.audioContext.close();
  }
}
