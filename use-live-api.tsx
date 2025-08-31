/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { GenAILiveClient } from './genai-live-client.ts';
import { AudioStreamer } from './audio-streamer.ts';
import { Part, UsageMetadata } from '@google/genai';

export type Message = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
};

export type UsageStats = {
    promptTokens: number;
    responseTokens: number;
    totalTokens: number;
};

export type UseLiveApiResults = {
  client: GenAILiveClient;
  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;
  send: (parts: Part[]) => void;
  outputVolume: number;
  messages: Message[];
  lastUsage: UsageStats | null;
  totalUsage: UsageStats;
};

// Create a context to provide the API results to child components
export const LiveAPIContext = createContext<UseLiveApiResults | null>(null);

export function useLiveApi({ apiKey, model, systemInstruction }: { apiKey: string; model?: string; systemInstruction?: string; }): UseLiveApiResults {
  const client = useMemo(() => new GenAILiveClient({ apiKey, model, systemInstruction }), [apiKey, model, systemInstruction]);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  
  const [outputVolume, setOutputVolume] = useState(0);
  const [connected, setConnected] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [lastUsage, setLastUsage] = useState<UsageStats | null>(null);
  const [totalUsage, setTotalUsage] = useState<UsageStats>({ promptTokens: 0, responseTokens: 0, totalTokens: 0 });
  const currentAiResponse = useRef('');
  const currentAiMessageId = useRef<string | null>(null);


  // Initialize the audio streamer for AI voice output
  useEffect(() => {
    if (!audioStreamerRef.current) {
        const audioCtx = new AudioContext({ sampleRate: 16000 });
        const streamer = new AudioStreamer(audioCtx);
        streamer.addVolumeWorklet().catch(err => console.error('Error adding volume worklet:', err));
        streamer.on('volume', (volume) => setOutputVolume(volume));
        audioStreamerRef.current = streamer;
    }
  }, []);

  // Bind to client events
  useEffect(() => {
    const onOpen = () => setConnected(true);
    const onClose = () => {
        setConnected(false);
        audioStreamerRef.current?.stop();
    };
    const onAudio = (data: ArrayBuffer) => {
        audioStreamerRef.current?.addPCM16(data);
    };
    const onError = (error: Error) => {
        console.error('Live API Error:', error);
        // Optionally handle UI feedback for errors
    };
    const onText = (textChunk: string) => {
        currentAiResponse.current += textChunk;
        if (currentAiMessageId.current) {
            setMessages(prev => prev.map(m => m.id === currentAiMessageId.current ? {...m, text: currentAiResponse.current} : m));
        } else {
            const newId = `ai-${Date.now()}`;
            currentAiMessageId.current = newId;
            setMessages(prev => [...prev, {id: newId, sender: 'ai', text: currentAiResponse.current}]);
        }
    };
    const onUsage = (metadata: UsageMetadata) => {
        const usage: UsageStats = {
            promptTokens: metadata.promptTokenCount ?? 0,
            responseTokens: Math.max(0, (metadata.totalTokenCount ?? 0) - (metadata.promptTokenCount ?? 0)),
            totalTokens: metadata.totalTokenCount ?? 0,
        };
        setLastUsage(usage);
        setTotalUsage(prev => ({
            promptTokens: prev.promptTokens + usage.promptTokens,
            responseTokens: prev.responseTokens + usage.responseTokens,
            totalTokens: prev.totalTokens + usage.totalTokens,
        }));
        // Reset for next AI message
        currentAiResponse.current = '';
        currentAiMessageId.current = null;
    };

    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('audio', onAudio);
    client.on('error', onError);
    client.on('text', onText);
    client.on('usage', onUsage);

    return () => {
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('audio', onAudio);
      client.off('error', onError);
      client.off('text', onText);
      client.off('usage', onUsage);
    };
  }, [client]);

  const connect = useCallback(async () => {
    await client.connect();
  }, [client]);

  const disconnect = useCallback(() => {
    client.disconnect();
  }, [client]);

  const send = useCallback((parts: Part[]) => {
      const textPart = parts.find(p => 'text' in p) as {text: string} | undefined;
      if (textPart) {
          setMessages(prev => [...prev, { id: `user-${Date.now()}`, sender: 'user', text: textPart.text }]);
      }
      currentAiResponse.current = '';
      currentAiMessageId.current = null;
      client.sendRealtimeInput(parts);
  }, [client]);

  return { client, connect, connected, disconnect, send, outputVolume, messages, lastUsage, totalUsage };
}
