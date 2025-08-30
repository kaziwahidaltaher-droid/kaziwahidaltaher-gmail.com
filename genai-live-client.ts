/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Chat, GenerateContentResponse, Part, UsageMetadata } from '@google/genai';
import { EventEmitter } from './event-emitter.ts';
import { decode } from './utils.tsx';

type GenAILiveClientOptions = {
    apiKey: string;
    model?: string;
    systemInstruction?: string;
};

/**
 * Manages the connection and communication with the Gemini API for a live,
 * streaming voice-to-voice conversation.
 * 
 * Events:
 * - `open`: Connection established.
 * - `close`: Connection closed.
 * - `error`: An error occurred.
 * - `audio`: Received an audio chunk from the AI.
 * - `text`: Received a text chunk from the AI.
 * - `usage`: Received usage metadata for a turn.
 * - `interrupted`: The AI response was interrupted.
 */
export class GenAILiveClient extends EventEmitter {
    private ai: GoogleGenAI;
    private chat: Chat | null = null;
    private model: string;
    private isConnected = false;
    private systemInstruction?: string;

    constructor({ apiKey, model = 'gemini-2.5-flash', systemInstruction }: GenAILiveClientOptions) {
        super();
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
        this.systemInstruction = systemInstruction;
    }

    /**
     * Establishes a connection to the AI.
     */
    async connect() {
        if (this.isConnected) return;
        
        const config: any = {
            // Explicitly request audio responses from the model.
            responseModalities: ['AUDIO', 'TEXT'],
        };

        if (this.systemInstruction) {
            config.systemInstruction = this.systemInstruction;
        }

        this.chat = this.ai.chats.create({
            model: this.model,
            config
        });

        this.isConnected = true;
        this.emit('open');
    }

    /**
     * Disconnects from the AI.
     */
    disconnect() {
        if (!this.isConnected) return;
        this.isConnected = false;
        this.chat = null;
        this.emit('close');
    }

    /**
     * Sends a real-time input (like an audio chunk) to the AI.
     */
    async sendRealtimeInput(parts: Part[]) {
        if (!this.chat || !this.isConnected) {
            console.error('Not connected. Cannot send input.');
            this.emit('error', new Error('Not connected'));
            return;
        }

        try {
            const resultStream = await this.chat.sendMessageStream({ message: parts });

            for await (const chunk of resultStream) {
                // Text
                const text = chunk.text;
                if (text) {
                    this.emit('text', text);
                }

                // Audio
                const audioParts = chunk.candidates?.[0]?.content?.parts.filter(
                    p => p.inlineData && p.inlineData.mimeType.startsWith('audio/')
                );

                if (audioParts) {
                    for (const part of audioParts) {
                        if (part.inlineData) {
                            const audioData = decode(part.inlineData.data);
                            this.emit('audio', audioData.buffer);
                        }
                    }
                }
                
                // Usage Metadata
                if (chunk.usageMetadata) {
                    this.emit('usage', chunk.usageMetadata);
                }
            }
        } catch (error) {
            console.error('Error sending message stream to Gemini:', error);
            this.emit('error', error);
        }
    }
}