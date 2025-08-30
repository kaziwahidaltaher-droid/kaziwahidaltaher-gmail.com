/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useContext, useState, useEffect, useRef } from 'react';
import { LiveAPIContext } from './use-live-api.tsx';
import cn from 'classnames';
import { AudioRecorder } from './audio-recorder.ts';
import { createAudioPart } from './utils.tsx';

const ControlTray: React.FC = () => {
    const liveApi = useContext(LiveAPIContext);
    const recorderRef = useRef<AudioRecorder | null>(null);
    const [inputVolume, setInputVolume] = useState(0);

    // Effect to manage the audio recorder based on connection status
    useEffect(() => {
        if (!liveApi?.connected) {
            recorderRef.current?.stop();
            recorderRef.current = null;
            setInputVolume(0);
            return;
        }

        const onSpeechEnded = (buffer: Float32Array) => {
            if (buffer.length === 0) return;
            // The API may require a non-empty text part.
            const textPart = { text: ' ' }; 
            const audioPart = createAudioPart(buffer);
            liveApi.send([audioPart, textPart]);
        };

        const recorder = new AudioRecorder();
        recorderRef.current = recorder;
        recorder.on('speechEnded', onSpeechEnded);
        recorder.on('volume', (vol) => setInputVolume(vol));
        recorder.start().catch(err => {
            console.error("Recorder start failed:", err);
            // We can optionally disconnect or show an error state
            liveApi.disconnect();
        });

        return () => {
            recorder.stop();
            recorderRef.current = null;
        };
    }, [liveApi, liveApi?.connected]); // Depend on liveApi and its connected status

    const [isConnecting, setIsConnecting] = useState(false);

    if (!liveApi) {
        return <footer className="control-tray-container" />;
    }
    
    const { connected, connect, disconnect } = liveApi;

    const handleToggleConnection = async () => {
        if (connected) {
            disconnect();
        } else {
            setIsConnecting(true);
            try {
                await connect();
            } catch (error) {
                console.error("Failed to connect:", error);
            } finally {
                setIsConnecting(false);
            }
        }
    };
    
    // A simple mic visualization with a pulsating ring
    const micVisual = (
         <div className="mic-indicator-container">
            <div className="volume-ring" style={{ transform: `scale(${1 + inputVolume * 15})` }} />
            <div className="mic-icon">
                <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 0 24 24" width="36px" fill="currentColor">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/>
                </svg>
            </div>
            <div className={cn("recording-dot", { "is-recording": connected })} />
        </div>
    );
    
    return (
        <footer className="control-tray-container">
            {micVisual}
            <button 
                onClick={handleToggleConnection} 
                disabled={isConnecting}
                className={cn('connection-btn', { 
                    'connected': connected,
                    'connecting': isConnecting
                })}
            >
                {isConnecting ? 'INITIALIZING...' : (connected ? 'END TRANSMISSION' : 'BEGIN TRANSMISSION')}
            </button>
        </footer>
    );
};

export default ControlTray;
