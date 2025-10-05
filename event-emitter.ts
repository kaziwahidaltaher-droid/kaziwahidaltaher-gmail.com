type Listener<T = any> = (payload: T) => void;

export class EventEmitter {
  private events: Map<string, Listener[]> = new Map();

  /**
   * Subscribe to an event
   */
  public on<T>(event: string, listener: Listener<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  /**
   * Unsubscribe from an event
   */
  public off<T>(event: string, listener: Listener<T>): void {
    const listeners = this.events.get(event);
    if (!listeners) return;
    this.events.set(event, listeners.filter(l => l !== listener));
  }

  /**
   * Emit an event with optional payload
   */
  public emit<T>(event: string, payload?: T): void {
    const listeners = this.events.get(event);
    if (!listeners) return;
    listeners.forEach(listener => listener(payload));
  }

  /**
   * Clear all listeners for an event
   */
  public clear(event: string): void {
    this.events.delete(event);
  }

  /**
   * Clear all events
   */
  public clearAll(): void {
    this.events.clear();
  }
}
