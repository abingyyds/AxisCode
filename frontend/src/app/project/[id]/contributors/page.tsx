'use client';
import { use, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';

interface Contribution {
  userId: string;
  username: string;
  avatarUrl: string | null;
  score: number | null;
  summary: string | null;
  taskId: string;
  createdAt: string;
}

interface LeaderboardEntry {
  username: string;
  avatarUrl: string | null;
  totalScore: number;
  taskCount: number;
}

export default function Contributors({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    apiFetch(`/api/plaza/${id}/contributions`).then((data: Contribution[]) => {
      const map = new Map<string, LeaderboardEntry>();
      for (const c of data) {
        const entry = map.get(c.username) || { username: c.username, avatarUrl: c.avatarUrl, totalScore: 0, taskCount: 0 };
        entry.totalScore += c.score || 0;
        entry.taskCount++;
        map.set(c.username, entry);
      }
      setLeaderboard([...map.values()].sort((a, b) => b.totalScore - a.totalScore));
    }).catch(() => {});
  }, [id]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Contributors</h1>
        {leaderboard.length === 0 ? (
          <p className="text-gray-500">No contributions yet</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div key={entry.username} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4">
                <span className="text-lg font-bold text-gray-500 w-8">#{i + 1}</span>
                {entry.avatarUrl && <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full" />}
                <div className="flex-1">
                  <span className="font-semibold">{entry.username}</span>
                  <span className="text-sm text-gray-500 ml-2">{entry.taskCount} tasks</span>
                </div>
                <span className="text-lg font-bold text-blue-400">{entry.totalScore}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
