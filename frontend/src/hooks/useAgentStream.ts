'use client';
import { useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';

export function useAgentStream(taskId: string | null) {
  const { lastMessage } = useWebSocket();
  const [logs, setLogs] = useState<{ content: string; logType: string }[]>([]);

  useEffect(() => {
    if (!lastMessage || !taskId) return;
    const msg = lastMessage as { type: string; taskId: string; payload: { content: string; logType: string } };
    if (msg.type === 'agent_log' && msg.taskId === taskId) {
      setLogs(prev => [...prev, msg.payload]);
    }
  }, [lastMessage, taskId]);

  return { logs, clearLogs: () => setLogs([]) };
}
