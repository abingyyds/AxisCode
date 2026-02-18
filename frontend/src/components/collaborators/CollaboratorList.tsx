'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface Collaborator {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  role: string;
}

export default function CollaboratorList({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const [collabs, setCollabs] = useState<Collaborator[]>([]);

  useEffect(() => {
    apiFetch(`/api/collaborators/${projectId}`).then(setCollabs).catch(() => {});
  }, [projectId]);

  const remove = async (userId: string) => {
    await apiFetch(`/api/collaborators/${projectId}/${userId}`, { method: 'DELETE' });
    setCollabs(prev => prev.filter(c => c.userId !== userId));
  };

  return (
    <div className="space-y-2">
      {collabs.map(c => (
        <div key={c.id} className="flex items-center justify-between bg-gray-800 rounded p-3">
          <div className="flex items-center gap-2">
            {c.avatarUrl && <img src={c.avatarUrl} alt="" className="w-6 h-6 rounded-full" />}
            <span>{c.username}</span>
            <span className="text-xs text-gray-500">{c.role}</span>
          </div>
          {isOwner && c.role !== 'owner' && (
            <button onClick={() => remove(c.userId)} className="text-red-400 text-sm hover:text-red-300">Remove</button>
          )}
        </div>
      ))}
    </div>
  );
}
