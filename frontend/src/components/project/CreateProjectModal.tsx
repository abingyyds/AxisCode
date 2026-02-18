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
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    apiFetch('/api/projects/github-repos')
      .then(setRepos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const create = async (repo: Repo) => {
    await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: repo.name,
        githubRepoOwner: repo.owner,
        githubRepoName: repo.name,
        githubRepoUrl: repo.url,
        defaultBranch: repo.defaultBranch,
        isPublic,
        ...(description && { description }),
        ...(tags && { tags }),
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
        {!selectedRepo ? (
          <>
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
                  onClick={() => setSelectedRepo(r)}
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
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4">Configure {selectedRepo.name}</h2>
            <div className="space-y-3">
              <textarea
                placeholder="Project description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                rows={2}
              />
              <input
                placeholder="Tags (comma-separated, optional)"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                Publish to Project Plaza (public)
              </label>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={selectedRepo ? () => setSelectedRepo(null) : onClose} className="px-4 py-2 text-gray-400 hover:text-white">
            {selectedRepo ? 'Back' : 'Cancel'}
          </button>
          {selectedRepo && (
            <button onClick={() => create(selectedRepo)} className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700">
              Create
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
