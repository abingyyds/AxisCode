'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import TaskInput from '@/components/agent/TaskInput';
import AgentTerminal from '@/components/agent/AgentTerminal';
import PreviewFrame from '@/components/preview/PreviewFrame';

interface Task {
  id: string;
  instruction: string;
  status: string;
  previewUrl?: string;
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/'); return; }
    apiFetch(`/api/tasks/project/${id}`).then(setTasks).catch(() => {});
  }, [id, router]);

  const onSubmit = async (instruction: string) => {
    const task = await apiFetch(`/api/tasks/project/${id}`, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    });
    setTasks(prev => [task, ...prev]);
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
              {activeTask.previewUrl && <PreviewFrame url={activeTask.previewUrl} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
