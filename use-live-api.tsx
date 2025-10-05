import { useEffect, useRef, useCallback } from 'react';

type Listener<T = any> = (payload: T) => void;

interface UseLiveAPIOptions {
  url: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useLiveAPI = ({
  url,
  onConnect,
  onDisconnect,
  onError,
}: UseLiveAPIOptions) => {
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Listener[]>>(new Map());

  const connect = useCallback(() => {
    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = () => {
      if (onConnect) onConnect();
    };

    socketRef.current.onmessage = (event: MessageEvent) => {
      const { type, payload } = JSON.parse(event.data);
      const listeners = listenersRef.current.get(type);
      if (listeners) {
        listeners.forEach(listener => listener(payload));
      }
    };

    socketRef.current.onclose = () => {
      if (onDisconnect) onDisconnect();
    };

    socketRef.current.onerror = (error) => {
      if (onError) onError(error);
    };
  }, [url, onConnect, onDisconnect, onError]);

  const send = useCallback((type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const on = useCallback(<T,>(type: string, listener: Listener<T>) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, []);
    }
    listenersRef.current.get(type)!.push(listener);
  }, []);

  const off = useCallback(<T,>(type: string, listener: Listener<T>) => {
    const listeners = listenersRef.current.get(type);
    if (listeners) {
      listenersRef.current.set(type, listeners.filter(l => l !== listener));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { send, on, off };
};
