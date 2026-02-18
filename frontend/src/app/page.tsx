'use client';
import { apiFetch } from '@/lib/api';
import Squares from '@/components/ui/Squares';
import BlurText from '@/components/ui/BlurText';
import ShinyText from '@/components/ui/ShinyText';

export default function Home() {
  const login = async () => {
    const { url } = await apiFetch('/api/auth/github');
    window.location.href = url;
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Squares direction="diagonal" speed={0.3} borderColor="#222" squareSize={50} hoverFillColor="#1a1a2e" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-6">
        <BlurText
          text="AxiSCode"
          className="text-6xl font-bold tracking-tight"
          delay={150}
          animateBy="letters"
        />
        <ShinyText
          text="AI-driven code collaboration platform"
          className="text-xl text-gray-400"
          speed={3}
        />
        <button
          onClick={login}
          className="mt-4 bg-white text-black px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
