'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createWS } from '@/lib/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queueRef = useRef<string[]>([]);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    const ws = createWS();
    if (!ws) return;
    wsRef.current = ws;
    ws.onopen = () => {
      for (const msg of queueRef.current) ws.send(msg);
      queueRef.current = [];
    };
    ws.onmessage = (e) => setLastMessage(JSON.parse(e.data));
    ws.onclose = () => { wsRef.current = null; };
    return () => ws.close();
  }, []);

  const send = useCallback((data: unknown) => {
    const msg = JSON.stringify(data);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(msg);
    } else {
      queueRef.current.push(msg);
    }
  }, []);

  return { lastMessage, send };
}
