'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function InviteModal({ projectId, onClose }: {
  projectId: string;
  onClose: () => void;
}) {
  const [username, setUsername] = useState('');

  const invite = async () => {
    if (!username.trim()) return;
    await apiFetch(`/api/collaborators/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ username, role: 'worker' }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Invite Collaborator</h2>
        <input placeholder="GitHub username" value={username} onChange={e => setUsername(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-400">Cancel</button>
          <button onClick={invite} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Invite</button>
        </div>
      </div>
    </div>
  );
}
