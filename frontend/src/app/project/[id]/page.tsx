'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar tasks={tasks} activeTask={activeTask} onSelect={setActiveTask} />
        <main className="flex-1 p-6 flex flex-col gap-4">
          <TaskInput onSubmit={onSubmit} />
          {activeTask && (
            <>
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
