/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Add necessary type definitions for AudioWorklet context.
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
 * An AudioWorkletProcessor that calculates the volume (RMS) of an audio stream
 * and posts it back to the main thread.
 */
class VolMeterProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      if (channelData) {
        let sum = 0.0;
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);
        this.port.postMessage({ type: 'volume', volume: rms });
      }
    }
    return true; // Keep processor alive
  }
}

registerProcessor('vol-meter-processor', VolMeterProcessor);