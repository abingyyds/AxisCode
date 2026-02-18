'use client';
import Link from 'next/link';
import { clearToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const logout = () => { clearToken(); router.push('/'); };

  return (
    <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="text-xl font-bold">AxiSCode</Link>
      <div className="flex gap-4 items-center">
        <Link href="/settings" className="text-gray-400 hover:text-white text-sm">Settings</Link>
        <button onClick={logout} className="text-gray-400 hover:text-white text-sm">Logout</button>
      </div>
    </nav>
  );
}
