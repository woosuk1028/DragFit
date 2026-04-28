'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function HomePage() {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    router.replace(isAuthenticated ? '/dashboard' : '/login');
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">DragFit</p>
        <h1 className="text-3xl font-semibold tracking-tight">옷장을 손끝으로</h1>
        <div className="pt-4">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse mx-1.5 [animation-delay:150ms]" />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
