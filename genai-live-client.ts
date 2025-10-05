type GenAIMessage = {
  type: 'emotion' | 'text' | 'sync' | 'config';
  payload: any;
};

type GenAIEvent = {
  type: string;
  data: any;
};

export class GenAILiveClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private connected: boolean = false;

  constructor(private serverURL: string) {}

  connect(): void {
    this.socket = new WebSocket(this.serverURL);

    this.socket.onopen = () => {
      this.connected = true;
      this.emitLocal('connected', {});
    };

    this.socket.onmessage = (event) => {
      const message: GenAIEvent = JSON.parse(event.data);
      this.emitLocal(message.type, message.data);
    };

    this.socket.onclose = () => {
      this.connected = false;
      this.emitLocal('disconnected', {});
    };

    this.socket.onerror = (err) => {
      this.emitLocal('error', err);
    };
  }

  send(message: GenAIMessage): void {
    if (this.socket && this.connected) {
      this.socket.send(JSON.stringify(message));
    }
  }

  on(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  off(eventType: string, callback: (data: any) => void): void {
    const group = this.listeners.get(eventType);
    if (!group) return;
    this.listeners.set(eventType, group.filter(fn => fn !== callback));
  }

  private emitLocal(eventType: string, data: any): void {
    const group = this.listeners.get(eventType);
    if (!group) return;
    group.forEach(fn => fn(data));
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }
}
