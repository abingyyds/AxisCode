'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function CreateProjectModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  const submit = async () => {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return;
    await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: name || match[2],
        githubRepoOwner: match[1],
        githubRepoName: match[2].replace(/\.git$/, ''),
        githubRepoUrl: repoUrl,
      }),
    });
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold">New Project</h2>
        <input placeholder="Project name" value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
        <input placeholder="GitHub repo URL" value={repoUrl} onChange={e => setRepoUrl(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
          <button onClick={submit} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">Create</button>
        </div>
      </div>
    </div>
  );
}
