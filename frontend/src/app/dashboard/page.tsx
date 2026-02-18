'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { useWebSocket } from '@/hooks/useWebSocket';
import Navbar from '@/components/layout/Navbar';
import ProjectCard from '@/components/project/ProjectCard';
import CreateProjectModal from '@/components/project/CreateProjectModal';

interface Project {
  id: string;
  name: string;
  githubRepoOwner: string;
  githubRepoName: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { lastMessage } = useWebSocket();

  const reload = () => apiFetch('/api/projects').then(setProjects);

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/'); return; }
    reload();
  }, [router]);

  useEffect(() => {
    if (!lastMessage) return;
    const msg = lastMessage as { type: string; payload?: { projectName?: string } };
    if (msg.type === 'invited') {
      setToast(`You were invited to "${msg.payload?.projectName}"`);
      reload();
      setTimeout(() => setToast(null), 5000);
    }
  }, [lastMessage]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">
            New Project
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={reload} />}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
