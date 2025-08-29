/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { memo, ReactNode, useRef, useState, useContext, FormEvent, useEffect } from 'react';
import cn from 'classnames';
import { LiveAPIContext } from './use-live-api.tsx';
import { AudioRecorder } from './audio-recorder.ts';
import { createAudioPart } from './utils.tsx';

export type ControlTrayProps = {
  children?: ReactNode;
};

function ControlTray({ children }: ControlTrayProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  const liveApi = useContext(LiveAPIContext);
  if (!liveApi) {
    return <div>Error: ControlTray must be used within a LiveAPIContext.Provider</div>;
  }
  const { connected, connect, disconnect, send } = liveApi;
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (connected && text.trim()) {
        send([{ text: text.trim() }]);
        setText('');
    }
  };

  const stopListening = () => {
    if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
    }
    setIsListening(false);
  };

  const handleSpeechEnded = (buffer: Float32Array) => {
    if (buffer.length > 0) {
      send([createAudioPart(buffer)]);
    }
    stopListening();
  };
  
  const toggleListen = async () => {
    if (isListening) {
        stopListening();
    } else {
        const recorder = new AudioRecorder();
        recorder.on('speechEnded', handleSpeechEnded);
        recorder.on('error', (err) => {
            console.error('Recorder error:', err);
            // Optionally show an error to the user
            stopListening();
        });
        
        try {
          await recorder.start();
          recorderRef.current = recorder;
          setIsListening(true);
        } catch (err) {
          console.error("Failed to start recorder:", err);
          // Handle cases where microphone permission is denied
        }
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Stop listening if connection is lost
  useEffect(() => {
    if (!connected) {
      stopListening();
    }
  }, [connected]);

  return (
    <section className="control-tray">
      <div className={cn('connection-container', { connected })}>
        <div className="connection-button-container">
          <button
            ref={connectButtonRef}
            className={cn('action-button connect-toggle', { connected })}
            onClick={connected ? disconnect : connect}
            aria-label={connected ? 'Disconnect from AI' : 'Connect to AI'}
          >
            {connected ? 
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> :
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 5v14l11-7L8 5z"/></svg>
            }
          </button>
        </div>
        <span className="text-indicator">{connected ? 'Live' : 'Offline'}</span>
      </div>
      
      <form className={cn('actions-nav', { disabled: !connected })} onSubmit={handleSubmit}>
        <input
            type="text"
            className="text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isListening ? "Listening..." : "Speak to the cosmos..."}
            disabled={!connected || isListening}
            aria-label="Message to AI"
        />
        <button
            type="submit"
            className="action-button send-button"
            disabled={!connected || !text.trim() || isListening}
            aria-label="Send message"
        >
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2 .01 7z"/></svg>
        </button>
        <button
            type="button"
            className={cn('action-button mic-button', { recording: isListening })}
            disabled={!connected}
            onClick={toggleListen}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
        >
          {isListening ? 
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M6 6h12v12H6z"/></svg> :
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>
          }
        </button>
        {children}
      </form>
    </section>
  );
}

export default memo(ControlTray);