/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Analyser class for live audio visualisation.
 */
export class Analyser {
  private analyser: AnalyserNode;
  private bufferLength = 0;
  private dataArray: Uint8Array;
  private timeDomainDataArray: Float32Array;

  constructor(node: AudioNode) {
    this.analyser = node.context.createAnalyser();
    this.analyser.fftSize = 512; // Matched to original implementation for consistent analysis
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    this.timeDomainDataArray = new Float32Array(this.analyser.fftSize);
    node.connect(this.analyser);
  }

  update() {
    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getFloatTimeDomainData(this.timeDomainDataArray);
  }

  get data() {
    return this.dataArray;
  }
  
  get fftSize() {
    return this.analyser.fftSize;
  }

  get timeDomainData() {
      return this.timeDomainDataArray;
  }
}