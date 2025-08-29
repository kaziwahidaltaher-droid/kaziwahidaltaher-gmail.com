/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { EventEmitter } from './event-emitter.ts';
import { decodeAudioData } from './utils.tsx';

const VOL_METER_WORKLET_PATH = './vol-meter.ts';

/**
 * Plays back a stream of raw audio data using the Web Audio API.
 * 
 * Events:
 * - `volume`: Emits the current playback volume.
 */
export class AudioStreamer extends EventEmitter {
    private audioContext: AudioContext;
    private sourceNode: AudioBufferSourceNode | null = null;
    private volMeterNode: AudioWorkletNode | null = null;
    private gainNode: GainNode;
    private audioQueue: ArrayBuffer[] = [];
    private isPlaying = false;

    constructor(context: AudioContext) {
        super();
        this.audioContext = context;
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
    }

    /**
     * Initializes the volume meter worklet.
     */
    async addVolumeWorklet() {
        await this.audioContext.audioWorklet.addModule(VOL_METER_WORKLET_PATH);
        this.volMeterNode = new AudioWorkletNode(this.audioContext, 'vol-meter-processor');
        this.volMeterNode.port.onmessage = (event) => {
            if (event.data.type === 'volume') {
                this.emit('volume', event.data.volume);
            }
        };
        this.gainNode.connect(this.volMeterNode);
        this.volMeterNode.connect(this.audioContext.destination); // Connect to destination to keep it alive
    }

    /**
     * Adds raw PCM16 audio data to the playback queue.
     */
    addPCM16(data: ArrayBuffer) {
        this.audioQueue.push(data);
        if (!this.isPlaying) {
            this.playNextChunk();
        }
    }

    /**
     * Stops playback and clears the queue.
     */
    stop() {
        if (this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        this.audioQueue = [];
        this.isPlaying = false;
    }

    private async playNextChunk() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }
        this.isPlaying = true;

        const data = this.audioQueue.shift()!;
        try {
            const audioBuffer = await decodeAudioData(new Uint8Array(data), this.audioContext, 16000, 1);

            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = audioBuffer;
            this.sourceNode.connect(this.gainNode);
            this.sourceNode.onended = () => {
                this.playNextChunk();
            };
            this.sourceNode.start();
        } catch (error) {
            console.error("Error decoding or playing audio chunk:", error);
            this.isPlaying = false;
        }
    }
}
