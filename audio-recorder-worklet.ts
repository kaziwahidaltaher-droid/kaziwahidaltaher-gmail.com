// FIX: Add declarations for Audio Worklet globals to satisfy TypeScript.
declare const AudioWorkletProcessor: any;
declare const registerProcessor: (name: string, processorCtor: any) => void;

class AudioRecorderProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array[] = [];
  private frameSize = 128;

  constructor() {
    super();
  }

  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (input && input[0]) {
      const channelData = input[0];
      this.buffer.push(new Float32Array(channelData));

      // Send data to main thread every frame
      this.port.postMessage({
        type: 'audio-frame',
        samples: Array.from(channelData),
      });
    }

    return true; // keep processor alive
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);