'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import TaskInput from '@/components/agent/TaskInput';
import AgentTerminal from '@/components/agent/AgentTerminal';
import PreviewFrame from '@/components/preview/PreviewFrame';
import DeployPanel from '@/components/deploy/DeployPanel';

interface Task {
  id: string;
  instruction: string;
  status: string;
  previewUrl?: string;
  railwayServiceId?: string;
  prUrl?: string;
  prNumber?: string;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const { lastMessage, send } = useWebSocket();

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/'); return; }
    apiFetch(`/api/tasks/project/${id}`).then(setTasks).catch(() => {});
    send({ type: 'join-project', projectId: id });
  }, [id, router, send]);

  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage as { type: string; taskId?: string; payload?: Record<string, unknown> };
    if (msg.type === 'task_created') {
      const t = msg.payload as unknown as Task;
      setTasks(prev => prev.some(p => p.id === t.id) ? prev : [t, ...prev]);
    }
    if (msg.type === 'task_update' && msg.taskId) {
      setTasks(prev => prev.map(t => t.id === msg.taskId ? { ...t, ...msg.payload } : t));
      setActiveTask(prev => prev?.id === msg.taskId ? { ...prev, ...msg.payload } as Task : prev);
    }
  }, [lastMessage]);

  const onSubmit = async (instruction: string) => {
    const task = await apiFetch(`/api/tasks/project/${id}`, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    });
    setActiveTask(task);
  };

  const [prStatus, setPrStatus] = useState<{ merged: boolean; state: string } | null>(null);

  const taskAction = async (action: string) => {
    if (!activeTask) return;
    const updated = await apiFetch(`/api/tasks/${activeTask.id}/${action}`, { method: 'POST' });
    setActiveTask(prev => prev ? { ...prev, ...updated } : prev);
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  };

  useEffect(() => {
    setPrStatus(null);
    if (!activeTask?.prNumber) return;
    apiFetch(`/api/tasks/${activeTask.id}/pr-status`).then(setPrStatus).catch(() => {});
  }, [activeTask?.id, activeTask?.prNumber]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar tasks={tasks} activeTask={activeTask} onSelect={setActiveTask} />
        <main className="flex-1 p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <TaskInput onSubmit={onSubmit} />
            <Link href={`/project/${id}/settings`} className="text-gray-400 hover:text-white text-sm ml-4 whitespace-nowrap">
              Settings
            </Link>
          </div>
          {activeTask && (
            <>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-gray-400">[{activeTask.status}]</span>
                {activeTask.prUrl && (
                  <a href={activeTask.prUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    PR #{activeTask.prNumber}
                  </a>
                )}
                {prStatus && (
                  <span className={prStatus.merged ? 'text-purple-400' : prStatus.state === 'closed' ? 'text-red-400' : 'text-yellow-400'}>
                    {prStatus.merged ? 'Merged' : prStatus.state === 'closed' ? 'Closed' : 'Open'}
                  </span>
                )}
                {activeTask.status !== 'completed' && activeTask.status !== 'closed' && activeTask.status !== 'suspended' && (
                  <button onClick={() => taskAction('complete')} className="bg-green-700 px-2 py-1 rounded hover:bg-green-600">Complete</button>
                )}
                {activeTask.status !== 'suspended' && activeTask.status !== 'completed' && activeTask.status !== 'closed' && (
                  <button onClick={() => taskAction('suspend')} className="bg-yellow-700 px-2 py-1 rounded hover:bg-yellow-600">Suspend</button>
                )}
                {activeTask.status === 'suspended' && (
                  <button onClick={() => taskAction('retry')} className="bg-blue-700 px-2 py-1 rounded hover:bg-blue-600">Resume</button>
                )}
                {activeTask.status !== 'closed' && (
                  <button onClick={() => taskAction('close')} className="bg-red-700 px-2 py-1 rounded hover:bg-red-600">Close</button>
                )}
              </div>
              <AgentTerminal taskId={activeTask.id} />
              {activeTask.railwayServiceId && <DeployPanel taskId={activeTask.id} />}
              {activeTask.previewUrl && <PreviewFrame url={activeTask.previewUrl} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
