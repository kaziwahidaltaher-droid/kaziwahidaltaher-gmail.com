type Listener<T> = (payload: T) => void;

export class EventEmitter<T = any> {
  private listeners: Map<string, Listener<T>[]> = new Map();

  on(event: string, listener: Listener<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: Listener<T>): void {
    const group = this.listeners.get(event);
    if (!group) return;
    this.listeners.set(event, group.filter(l => l !== listener));
  }

  emit(event: string, payload: T): void {
    const group = this.listeners.get(event);
    if (!group) return;
    group.forEach(listener => listener(payload));
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
