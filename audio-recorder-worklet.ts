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

// Simple VAD parameters
const ENERGY_THRESHOLD = 0.005; // RMS threshold to start/stop detection
const SILENCE_DURATION_MS = 700; // How long to wait before considering speech ended
const MIN_SPEECH_DURATION_MS = 300; // Minimum duration of speech to be considered valid

/**
 * An AudioWorkletProcessor that performs simple Voice Activity Detection (VAD).
 * It buffers audio when speech is detected and sends the complete buffer
 * back to the main thread when speech ends.
 */
class VADWorkletProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array[] = [];
  private isSpeaking = false;
  private silenceCounter = 0;
  private speechCounter = 0;
  private silenceThreshold = 0;
  private speechThreshold = 0;

  constructor(options?: any) {
    super();
    // Calculate thresholds in terms of process() calls
    const sampleRate = options?.processorOptions?.sampleRate || 16000;
    this.silenceThreshold = (SILENCE_DURATION_MS / 1000) * sampleRate / 128; // 128 samples per frame
    this.speechThreshold = (MIN_SPEECH_DURATION_MS / 1000) * sampleRate / 128;
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Simple energy calculation (RMS)
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);

      if (rms > ENERGY_THRESHOLD) {
        this.silenceCounter = 0;
        if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.buffer = []; // Start new buffer
        }
        this.speechCounter++;
        this.buffer.push(channelData.slice());
      } else {
        if (this.isSpeaking) {
          this.silenceCounter++;
          if (this.silenceCounter > this.silenceThreshold) {
            if (this.speechCounter > this.speechThreshold) {
              // End of speech detected, send buffer
              const completeBuffer = this.concatenateBuffer();
              this.port.postMessage({ type: 'speechEnded', buffer: completeBuffer });
            }
            // Reset for next utterance
            this.isSpeaking = false;
            this.buffer = [];
            this.speechCounter = 0;
          } else {
            // Still in potential silence, keep buffering
            this.buffer.push(channelData.slice());
          }
        }
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

registerProcessor('vad-worklet-processor', VADWorkletProcessor);