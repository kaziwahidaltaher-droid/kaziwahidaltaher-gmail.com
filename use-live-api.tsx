import { useEffect, useRef, useState } from 'react';

interface LiveMessage {
  type: 'emotion' | 'text' | 'sync' | 'config';
  payload: any;
}

interface UseLiveAPIOptions {
  url: string;
  onMessage?: (msg: LiveMessage) => void;
  autoReconnect?: boolean;
}

export function useLiveAPI({ url, onMessage, autoReconnect = true }: UseLiveAPIOptions) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // FIX: Changed type from NodeJS.Timeout to a more general type that works in browser environments.
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      socketRef.current = new WebSocket(url);

      socketRef.current.onopen = () => {
        setConnected(true);
      };

      socketRef.current.onmessage = (event) => {
        try {
          const msg: LiveMessage = JSON.parse(event.data);
          onMessage?.(msg);
        } catch (err) {
          console.warn('Live API message parse error:', err);
        }
      };

      socketRef.current.onclose = () => {
        setConnected(false);
        if (autoReconnect) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };

      socketRef.current.onerror = (err) => {
        console.error('Live API socket error:', err);
      };
    };

    connect();
    return () => {
      clearTimeout(reconnectTimeout);
      socketRef.current?.close();
    };
  }, [url, autoReconnect, onMessage]);

  const send = (msg: LiveMessage) => {
    if (connected && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  };

  return { connected, send };
}