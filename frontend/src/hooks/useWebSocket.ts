'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { createWS } from '@/lib/ws';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    const ws = createWS();
    if (!ws) return;
    wsRef.current = ws;
    ws.onmessage = (e) => setLastMessage(JSON.parse(e.data));
    ws.onclose = () => { wsRef.current = null; };
    return () => ws.close();
  }, []);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { lastMessage, send };
}
