/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { EventEmitter } from './event-emitter.ts';

const RECORDER_WORKLET_PATH = './audio-recorder-worklet.ts';

/**
 * Manages microphone audio input, using a worklet to record audio on demand.
 * 
 * Events:
 * - `bufferReady`: Fired when recording stops, providing the audio buffer.
 * - `volume`: Fired continuously with the current input volume.
 * - `error`: Fired on error.
 */
export class AudioRecorder extends EventEmitter {
    private audioContext: AudioContext | null = null;
    private mediaStream: MediaStream | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private recorderNode: AudioWorkletNode | null = null;
    private volumeAnalyser: AnalyserNode | null = null;
    private volumeDataArray: Float32Array | null = null;
    private volumeCheckInterval: number | null = null;

    async start() {
        try {
            this.audioContext = new AudioContext({ sampleRate: 16000 });
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            }});

            // Recorder pipeline
            this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
            await this.audioContext.audioWorklet.addModule(RECORDER_WORKLET_PATH);
            this.recorderNode = new AudioWorkletNode(this.audioContext, 'recorder-worklet-processor');

            this.recorderNode.port.onmessage = (event) => {
                if (event.data.type === 'audioBuffer') {
                    this.emit('bufferReady', event.data.buffer);
                }
            };

            // Volume meter pipeline
            this.volumeAnalyser = this.audioContext.createAnalyser();
            this.volumeAnalyser.fftSize = 256;
            this.volumeDataArray = new Float32Array(this.volumeAnalyser.frequencyBinCount);
            
            this.sourceNode.connect(this.recorderNode);
            this.sourceNode.connect(this.volumeAnalyser);
            
            this.startVolumeCheck();

        } catch (error) {
            console.error("Error starting audio recorder:", error);
            this.emit('error', error);
        }
    }

    stop() {
        this.stopVolumeCheck();
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        this.mediaStream = null;
        this.audioContext = null;
    }

    startRecording() {
        this.recorderNode?.port.postMessage({ type: 'start' });
    }

    stopRecording() {
        this.recorderNode?.port.postMessage({ type: 'stop' });
    }

    private startVolumeCheck() {
        if (this.volumeCheckInterval) clearInterval(this.volumeCheckInterval);
        this.volumeCheckInterval = window.setInterval(() => {
            if (this.volumeAnalyser && this.volumeDataArray) {
                this.volumeAnalyser.getFloatTimeDomainData(this.volumeDataArray);
                let sum = 0;
                for (let i = 0; i < this.volumeDataArray.length; i++) {
                    sum += this.volumeDataArray[i] * this.volumeDataArray[i];
                }
                const rms = Math.sqrt(sum / this.volumeDataArray.length);
                this.emit('volume', rms);
            }
        }, 100);
    }
    
    private stopVolumeCheck() {
        if(this.volumeCheckInterval) {
            clearInterval(this.volumeCheckInterval);
            this.volumeCheckInterval = null;
        }
    }
}
