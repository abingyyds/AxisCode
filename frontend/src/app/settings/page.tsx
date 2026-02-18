'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

export default function Settings() {
  const [settings, setSettings] = useState({ hasAnthropicKey: false });
  const [anthropicKey, setAnthropicKey] = useState('');

  useEffect(() => {
    apiFetch('/api/settings').then(setSettings).catch(() => {});
  }, []);

  const save = async () => {
    if (!anthropicKey) return;
    await apiFetch('/api/settings', { method: 'PATCH', body: JSON.stringify({ anthropicKey }) });
    setAnthropicKey('');
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
          <p className="text-xs text-gray-500">Railway tokens are now configured per-project in Project Settings.</p>
          <button onClick={save} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700">Save</button>
        </div>
      </main>
    </div>
  );
}
