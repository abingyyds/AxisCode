'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import Navbar from '@/components/layout/Navbar';
import SpotlightCard from '@/components/ui/SpotlightCard';

interface PlazaProject {
  id: string;
  name: string;
  description: string | null;
  tags: string | null;
  githubRepoOwner: string;
  githubRepoName: string;
  ownerUsername: string;
  ownerAvatar: string | null;
  collaboratorCount: number;
}

export default function Plaza() {
  const router = useRouter();
  const [projects, setProjects] = useState<PlazaProject[]>([]);
  const [search, setSearch] = useState('');
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/plaza').then(setProjects).catch(() => {});
  }, []);

  const join = async (id: string) => {
    if (!isLoggedIn()) { router.push('/'); return; }
    setJoining(id);
    try {
      await apiFetch(`/api/plaza/${id}/join`, { method: 'POST' });
      router.push(`/project/${id}`);
    } catch {
      setJoining(null);
    }
  };

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q)
      || p.description?.toLowerCase().includes(q)
      || p.tags?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Project Plaza</h1>
        </div>
        <input
          placeholder="Search by name, description, or tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mb-6"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <SpotlightCard key={p.id}>
              <h3 className="font-semibold text-lg">{p.name}</h3>
              <p className="text-sm text-gray-400 mt-1">{p.githubRepoOwner}/{p.githubRepoName}</p>
              {p.description && <p className="text-sm text-gray-300 mt-2">{p.description}</p>}
              {p.tags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.tags.split(',').map(t => (
                    <span key={t.trim()} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">{t.trim()}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">by {p.ownerUsername} · {p.collaboratorCount} contributors</span>
                <button
                  onClick={() => join(p.id)}
                  disabled={joining === p.id}
                  className="bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {joining === p.id ? 'Joining...' : 'Join'}
                </button>
              </div>
            </SpotlightCard>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-gray-500 text-center mt-8">No public projects found</p>
        )}
      </main>
    </div>
  );
}
