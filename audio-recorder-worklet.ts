/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Add necessary type definitions for AudioWorklet context.
interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}
declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: any): AudioWorkletProcessor;
};
declare function registerProcessor(
  name: string,
  processorCtor: new (options?: any) => AudioWorkletProcessor
): void;

/**
 * An AudioWorkletProcessor that buffers audio when instructed and sends the
 * complete buffer back to the main thread upon request. This is used for
 * push-to-talk recording.
 */
class RecorderWorkletProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array[] = [];
  private isRecording = false;

  constructor() {
    super();
    this.port.onmessage = (event) => {
      if (event.data.type === 'start') {
        this.isRecording = true;
        this.buffer = []; // Start new buffer
      } else if (event.data.type === 'stop') {
        if (this.isRecording) {
          this.isRecording = false;
          const completeBuffer = this.concatenateBuffer();
          this.port.postMessage({ type: 'audioBuffer', buffer: completeBuffer });
        }
      }
    };
  }

  process(inputs: Float32Array[][]): boolean {
    if (this.isRecording) {
      const input = inputs[0];
      if (input && input.length > 0) {
        const channelData = input[0];
        // Buffer the audio data
        this.buffer.push(channelData.slice());
      }
    }
    return true; // Keep processor alive
  }

  private concatenateBuffer(): Float32Array {
    if (this.buffer.length === 0) {
      return new Float32Array(0);
    }
    const totalLength = this.buffer.reduce((acc, val) => acc + val.length, 0);
    const result = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.buffer) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

registerProcessor('recorder-worklet-processor', RecorderWorkletProcessor);
