'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

export default function Settings() {
  const [settings, setSettings] = useState({ hasAnthropicKey: false, hasRailwayToken: false });
  const [anthropicKey, setAnthropicKey] = useState('');
  const [railwayToken, setRailwayToken] = useState('');

  useEffect(() => {
    apiFetch('/api/settings').then(setSettings).catch(() => {});
  }, []);

  const save = async () => {
    const body: Record<string, string> = {};
    if (anthropicKey) body.anthropicKey = anthropicKey;
    if (railwayToken) body.railwayToken = railwayToken;
    await apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify(body) });
    setAnthropicKey('');
    setRailwayToken('');
    apiFetch('/api/settings').then(setSettings);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Anthropic API Key {settings.hasAnthropicKey && '(configured)'}
            </label>
            <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..." className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Railway Token {settings.hasRailwayToken && '(configured)'}
            </label>
            <input type="password" value={railwayToken} onChange={e => setRailwayToken(e.target.value)}
              placeholder="railway_..." className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" />
          </div>
          <button onClick={save} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </main>
    </div>
  );
}
