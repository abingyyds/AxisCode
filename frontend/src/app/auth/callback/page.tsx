'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { setToken } from '@/lib/auth';

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    if (!code) return;
    apiFetch('/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).then(({ token }) => {
      setToken(token);
      router.push('/dashboard');
    }).catch(() => router.push('/'));
  }, [params, router]);

  return <div className="flex items-center justify-center min-h-screen text-gray-400">Authenticating...</div>;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>}>
      <CallbackHandler />
    </Suspense>
  );
}
