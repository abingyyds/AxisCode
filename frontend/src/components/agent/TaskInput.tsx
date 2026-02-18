'use client';
import { useState } from 'react';

export default function TaskInput({ onSubmit }: { onSubmit: (instruction: string) => void }) {
  const [value, setValue] = useState('');

  const submit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue('');
  };

  return (
    <div className="flex gap-2">
      <input value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Describe what you want the AI to do..."
        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3" />
      <button onClick={submit} className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
        Run
      </button>
    </div>
  );
}
