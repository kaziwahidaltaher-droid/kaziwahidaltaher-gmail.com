export class AudioStreamer {
  private audioContext: AudioContext;
  private processor: ScriptProcessorNode;
  private source: MediaStreamAudioSourceNode | null = null;
  private socket: WebSocket | null = null;
  private isStreaming: boolean = false;

  constructor(private serverURL: string, private bufferSize = 1024) {
    this.audioContext = new AudioContext();
    this.processor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
  }

  async connect(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    this.socket = new WebSocket(this.serverURL);
    this.socket.onopen = () => {
      this.isStreaming = true;
    };

    this.processor.onaudioprocess = (event) => {
      if (!this.isStreaming || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const input = event.inputBuffer.getChannelData(0);
      const payload = new Float32Array(input);
      this.socket.send(payload.buffer);
    };
  }

  disconnect(): void {
    this.isStreaming = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    this.processor.disconnect();
    this.audioContext.close();
  }
}
