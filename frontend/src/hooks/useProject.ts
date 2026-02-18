'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

export function useProject(id: string) {
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/projects/${id}`)
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return { project, loading };
}
