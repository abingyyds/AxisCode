'use client';
import { useRef, useEffect } from 'react';
import { useAgentStream } from '@/hooks/useAgentStream';

export default function AgentTerminal({ taskId }: { taskId: string }) {
  const { logs } = useAgentStream(taskId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4 font-mono text-sm h-96 overflow-y-auto">
      {logs.map((log, i) => (
        <div key={i} className={log.logType === 'stderr' ? 'text-red-400' : log.logType === 'system' ? 'text-yellow-400' : 'text-green-400'}>
          {log.content}
        </div>
      ))}
      {logs.length === 0 && <span className="text-gray-600">Waiting for agent output...</span>}
      <div ref={endRef} />
    </div>
  );
}
