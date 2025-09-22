type GenAIEvent = {
  type: string;
  payload: any;
};

type Listener<T = any> = (payload: T) => void;

export class GenAILiveClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, Listener[]> = new Map();
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to the GenAI live backend
   */
  public connect(): void {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('[GenAI] Connected to live stream');
    };

    this.socket.onmessage = (event: MessageEvent) => {
      const data: GenAIEvent = JSON.parse(event.data);
      this.emit(data.type, data.payload);
    };

    this.socket.onclose = () => {
      console.log('[GenAI] Connection closed');
    };

    this.socket.onerror = (error) => {
      console.error('[GenAI] Connection error:', error);
    };
  }

  /**
   * Send a message to the GenAI backend
   */
  public send(type: string, payload: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      this.socket.send(message);
    }
  }

  /**
   * Subscribe to a specific event type
   */
  public on<T>(type: string, listener: Listener<T>): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  /**
   * Emit an event to all listeners
   */
  private emit<T>(type: string, payload: T): void {
    const listeners = this.listeners.get(type);
    if (!listeners) return;
    listeners.forEach(listener => listener(payload));
  }

  /**
   * Disconnect from the GenAI backend
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
