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

    const onMessage = (e: MessageEvent) => setLastMessage(JSON.parse(e.data));

    if (ws.readyState === WebSocket.OPEN) {
      for (const msg of queueRef.current) ws.send(msg);
      queueRef.current = [];
    }
    const onOpen = () => {
      for (const msg of queueRef.current) ws.send(msg);
      queueRef.current = [];
    };

    ws.addEventListener('open', onOpen);
    ws.addEventListener('message', onMessage);
    return () => {
      ws.removeEventListener('open', onOpen);
      ws.removeEventListener('message', onMessage);
    };
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
