/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

type EventListener = (...args: any[]) => void;

/**
 * A simple EventEmitter implementation for handling custom events.
 */
export class EventEmitter {
    private events: { [key: string]: EventListener[] } = {};

    /**
     * Registers an event listener.
     */
    on(event: string, listener: EventListener): this {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return this;
    }

    /**
     * Unregisters an event listener.
     */
    off(event: string, listener: EventListener): this {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
        return this;
    }

    /**
     * Emits an event, calling all registered listeners.
     */
    emit(event: string, ...args: any[]): void {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
    }
}
