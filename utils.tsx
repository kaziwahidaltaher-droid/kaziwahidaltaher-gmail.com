/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Part } from '@google/genai';

/**
 * Encodes a byte array into a base64 string.
 */
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string into a byte array.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Float32Array of audio data to an Int16Array.
 * @param buffer The Float32Array audio data (ranging from -1.0 to 1.0).
 * @returns An Int16Array containing the converted audio data.
 */
function float32ToInt16(buffer: Float32Array): Int16Array {
  const l = buffer.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp the values to avoid overflow and convert.
    int16[i] = Math.max(-1, Math.min(1, buffer[i])) * 32767;
  }
  return int16;
}

/**
 * Creates a GenAI `Part` object from raw Float32Array audio data.
 * @param data The raw audio data.
 * @returns A `Part` object ready to be sent to the Gemini API.
 */
function createAudioPart(data: Float32Array): Part {
  const int16 = float32ToInt16(data);
  return {
    inlineData: {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    }
  };
}

/**
 * Decodes raw audio data into a playable AudioBuffer.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }
  // Extract interleaved channels
  if (numChannels === 1) { // Corrected from 0 to 1
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i,
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
}


export { createAudioPart, decode, decodeAudioData, encode, float32ToInt16 };
