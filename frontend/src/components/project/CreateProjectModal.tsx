'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface Repo {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
}

export default function CreateProjectModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch('/api/projects/github-repos')
      .then(setRepos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const select = async (repo: Repo) => {
    await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: repo.name,
        githubRepoOwner: repo.owner,
        githubRepoName: repo.name,
        githubRepoUrl: repo.url,
        defaultBranch: repo.defaultBranch,
      }),
    });
    onCreated();
    onClose();
  };

  const filtered = repos.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Import GitHub Repository</h2>
        <input
          placeholder="Search repositories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 mb-3"
        />
        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading && <p className="text-gray-500 text-sm">Loading repos...</p>}
          {filtered.map(r => (
            <button
              key={`${r.owner}/${r.name}`}
              onClick={() => select(r)}
              className="w-full text-left px-3 py-2 rounded hover:bg-gray-800 flex justify-between items-center"
            >
              <span className="text-sm">{r.owner}/{r.name}</span>
              <span className="text-xs text-gray-500">{r.defaultBranch}</span>
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <p className="text-gray-500 text-sm">No repositories found</p>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
        </div>
      </div>
    </div>
  );
}
