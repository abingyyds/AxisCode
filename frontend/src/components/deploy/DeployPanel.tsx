'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  BUILDING: 'bg-yellow-500',
  DEPLOYING: 'bg-blue-500',
  SUCCESS: 'bg-green-500',
  FAILED: 'bg-red-500',
};

export default function DeployPanel({ taskId }: { taskId: string }) {
  const [status, setStatus] = useState<{ id: string; status: string } | null>(null);
  const [logs, setLogs] = useState<{ message: string; timestamp: string }[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logType, setLogType] = useState<'build' | 'deploy'>('build');

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const poll = async () => {
      try {
        const s = await apiFetch(`/api/tasks/${taskId}/deploy-status`);
        setStatus(s);
        if (s && !['SUCCESS', 'FAILED', 'CRASHED', 'REMOVED'].includes(s.status)) {
          timer = setTimeout(poll, 10000) as unknown as ReturnType<typeof setInterval>;
        }
      } catch { /* ignore */ }
    };
    poll();
    return () => clearTimeout(timer as unknown as number);
  }, [taskId]);

  const fetchLogs = async (type: 'build' | 'deploy') => {
    setLogType(type);
    setShowLogs(true);
    try {
      const l = await apiFetch(`/api/tasks/${taskId}/deploy-logs?type=${type}`);
      setLogs(l);
    } catch { setLogs([]); }
  };

  const redeploy = async () => {
    await apiFetch(`/api/tasks/${taskId}/redeploy`, { method: 'POST' });
    setStatus(prev => prev ? { ...prev, status: 'DEPLOYING' } : prev);
  };

  const color = STATUS_COLORS[status?.status || ''] || 'bg-gray-500';

  return (
    <div className="border border-gray-700 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-sm font-medium">{status?.status || 'Loading...'}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchLogs('build')} className="text-xs text-blue-400 hover:text-blue-300">
            Build Logs
          </button>
          <button onClick={() => fetchLogs('deploy')} className="text-xs text-blue-400 hover:text-blue-300">
            Deploy Logs
          </button>
          <button onClick={redeploy} className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700">
            Redeploy
          </button>
        </div>
      </div>
      {showLogs && (
        <div className="bg-gray-900 rounded p-3 max-h-64 overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">{logType} logs</span>
            <button onClick={() => setShowLogs(false)} className="text-xs text-gray-500">Close</button>
          </div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap">
            {logs.length ? logs.map(l => l.message).join('\n') : 'No logs available'}
          </pre>
        </div>
      )}
    </div>
  );
}
