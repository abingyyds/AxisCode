'use client';
import { use, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import CollaboratorList from '@/components/collaborators/CollaboratorList';
import InviteModal from '@/components/collaborators/InviteModal';

export default function ProjectSettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Record<string, any> | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [envTaskId, setEnvTaskId] = useState('');
  const [tasks, setTasks] = useState<{ id: string; instruction: string; railwayServiceId?: string }[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [railwayEnvs, setRailwayEnvs] = useState<{ id: string; name: string }[]>([]);
  const [railwaySvcs, setRailwaySvcs] = useState<{ id: string; name: string }[]>([]);
  const isOwner = project?.currentUserRole === 'owner';

  useEffect(() => {
    apiFetch(`/api/projects/${id}`).then(setProject).catch(() => {});
    apiFetch(`/api/tasks/project/${id}`).then(setTasks).catch(() => {});
  }, [id]);

  const updateProject = async (data: Record<string, unknown>) => {
    const updated = await apiFetch(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    setProject((prev: Record<string, any> | null) => ({ ...prev, ...updated }));
  };

  const linkRailway = async (data: Record<string, string>) => {
    const updated = await apiFetch(`/api/projects/${id}/link-railway`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setProject((prev: Record<string, any> | null) => ({ ...prev, ...updated }));
  };

  if (!project) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold">Project Settings</h1>
        {isOwner && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Project Plaza</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!project.isPublic}
                  onChange={e => updateProject({ isPublic: e.target.checked })}
                />
                Public (visible on Project Plaza)
              </label>
              <textarea
                placeholder="Project description"
                defaultValue={project.description || ''}
                onBlur={e => updateProject({ description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                rows={2}
              />
              <input
                placeholder="Tags (comma-separated)"
                defaultValue={project.tags || ''}
                onBlur={e => updateProject({ tags: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              />
            </div>
          </section>
        )}
        {isOwner && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Claude API Configuration</h2>
            <div className="space-y-2">
              <input
                placeholder="API Base URL (default: https://api.anthropic.com)"
                defaultValue={project.anthropicBaseUrl || ''}
                onBlur={e => linkRailway({ anthropicBaseUrl: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder={project.anthropicKey ? 'API Key (configured)' : 'API Key (sk-ant-...)'}
                onBlur={e => { if (e.target.value) linkRailway({ anthropicKey: e.target.value }); e.target.value = ''; }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
              <div className="flex gap-2">
                <select
                  value={project.anthropicModel || ''}
                  onChange={e => linkRailway({ anthropicModel: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2"
                >
                  <option value="">Default model</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <button
                  onClick={async () => {
                    try {
                      const list = await apiFetch(`/api/projects/${id}/fetch-models`, { method: 'POST' });
                      setModels(list);
                    } catch { /* ignore */ }
                  }}
                  className="bg-gray-700 px-3 py-2 rounded hover:bg-gray-600 text-sm whitespace-nowrap"
                >Fetch Models</button>
              </div>
              <p className="text-xs text-gray-500">Set API key first, then click Fetch Models to load available models.</p>
            </div>
          </section>
        )}
        {isOwner && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Railway Integration</h2>
            <div className="space-y-2">
              <input
                placeholder="Railway Project ID"
                defaultValue={project.railwayProjectId || ''}
                onBlur={e => linkRailway({ railwayProjectId: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
              <input
                type="password"
                placeholder={project.railwayToken ? 'Railway Token (configured)' : 'Railway Token'}
                onBlur={e => { if (e.target.value) linkRailway({ railwayToken: e.target.value }); e.target.value = ''; }}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
              <div className="flex gap-2">
                <select
                  value={project.railwayEnvironmentId || ''}
                  onChange={e => linkRailway({ railwayEnvironmentId: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2"
                >
                  <option value="">Select environment...</option>
                  {railwayEnvs.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id.slice(0, 8)})</option>)}
                </select>
                <button
                  onClick={async () => {
                    try { setRailwayEnvs(await apiFetch(`/api/projects/${id}/railway-environments`, { method: 'POST' })); } catch {}
                  }}
                  className="bg-gray-700 px-3 py-2 rounded hover:bg-gray-600 text-sm whitespace-nowrap"
                >Fetch</button>
              </div>
              <p className="text-xs text-gray-500">Set Project ID and Token first, then fetch environments. All collaborators&apos; deployments use this config.</p>
            </div>
          </section>
        )}
        {isOwner && (
          <section>
            <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
            <div className="space-y-2">
              <select
                value={envTaskId}
                onChange={e => setEnvTaskId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
              >
                <option value="">Select a task...</option>
                {tasks.filter(t => t.railwayServiceId).map(t => (
                  <option key={t.id} value={t.id}>{t.instruction.slice(0, 60)}</option>
                ))}
              </select>
              {envVars.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    placeholder="KEY"
                    value={v.key}
                    onChange={e => setEnvVars(prev => prev.map((p, j) => j === i ? { ...p, key: e.target.value } : p))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="value"
                    value={v.value}
                    onChange={e => setEnvVars(prev => prev.map((p, j) => j === i ? { ...p, value: e.target.value } : p))}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  onClick={() => setEnvVars(prev => [...prev, { key: '', value: '' }])}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >+ Add row</button>
                <button
                  onClick={async () => {
                    const variables: Record<string, string> = {};
                    envVars.forEach(v => { if (v.key) variables[v.key] = v.value; });
                    if (!Object.keys(variables).length || !envTaskId) return;
                    await apiFetch(`/api/projects/${id}/env-vars`, {
                      method: 'POST',
                      body: JSON.stringify({ variables, taskId: envTaskId }),
                    });
                  }}
                  className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 text-sm"
                >Push to Railway</button>
              </div>
            </div>
          </section>
        )}
        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Collaborators</h2>
            {isOwner && (
              <button onClick={() => setShowInvite(true)} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 text-sm">
                Invite
              </button>
            )}
          </div>
          <CollaboratorList projectId={id} isOwner={isOwner} />
        </section>
        {showInvite && <InviteModal projectId={id} onClose={() => setShowInvite(false)} />}
      </main>
    </div>
  );
}
