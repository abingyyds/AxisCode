'use client';
import { use, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import CollaboratorList from '@/components/collaborators/CollaboratorList';
import InviteModal from '@/components/collaborators/InviteModal';

export default function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Record<string, string> | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    apiFetch(`/api/projects/${id}`).then(setProject).catch(() => {});
  }, [id]);

  const linkRailway = async (railwayProjectId: string) => {
    const updated = await apiFetch(`/api/projects/${id}/link-railway`, {
      method: 'POST',
      body: JSON.stringify({ railwayProjectId }),
    });
    setProject(updated);
  };

  if (!project) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <section>
          <h2 className="text-lg font-semibold mb-2">Railway Integration</h2>
          <div className="flex gap-2">
            <input
              placeholder="Railway Project ID"
              defaultValue={project.railwayProjectId || ''}
              onBlur={e => linkRailway(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 flex-1"
            />
          </div>
        </section>
        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Collaborators</h2>
            <button onClick={() => setShowInvite(true)} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 text-sm">
              Invite
            </button>
          </div>
          <CollaboratorList projectId={id} />
        </section>
        {showInvite && <InviteModal projectId={id} onClose={() => setShowInvite(false)} />}
      </main>
    </div>
  );
}
