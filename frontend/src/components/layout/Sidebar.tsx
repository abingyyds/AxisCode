'use client';

interface Task {
  id: string;
  instruction: string;
  status: string;
}

export default function Sidebar({ tasks, activeTask, onSelect }: {
  tasks: Task[];
  activeTask: Task | null;
  onSelect: (t: Task) => void;
}) {
  return (
    <aside className="w-64 border-r border-gray-800 p-4 space-y-2 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-400 mb-2">Tasks</h2>
      {tasks.map(t => (
        <button key={t.id} onClick={() => onSelect(t)}
          className={`w-full text-left p-2 rounded text-sm truncate ${activeTask?.id === t.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}>
          <span className="text-xs text-gray-500 mr-1">[{t.status}]</span>
          {t.instruction}
        </button>
      ))}
      {tasks.length === 0 && <p className="text-gray-600 text-sm">No tasks yet</p>}
    </aside>
  );
}
