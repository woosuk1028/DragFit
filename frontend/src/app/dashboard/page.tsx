'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useOutfitStore } from '@/lib/store';
import { outfitsAPI } from '@/lib/api';
import ImageUploader from '@/components/ImageUploader';
import OutfitCanvas from '@/components/OutfitCanvas';
import OutfitList from '@/components/OutfitList';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);
  const setOutfits = useOutfitStore((s) => s.setOutfits);
  const [activeTab, setActiveTab] = useState<'builder' | 'list'>('builder');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    hydrate();
    setHydrated(true);
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [hydrated, isAuthenticated, router]);

  const loadOutfits = useCallback(async () => {
    try {
      const response = await outfitsAPI.getOutfits();
      setOutfits(response.data);
    } catch (e) {
      console.error('Failed to load outfits', e);
    }
  }, [setOutfits]);

  useEffect(() => {
    if (isAuthenticated) loadOutfits();
  }, [isAuthenticated, loadOutfits]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <p className="text-sm text-neutral-400 tracking-widest uppercase">Loading</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="bg-white border-b border-neutral-200/80 sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold tracking-tight text-neutral-900">DragFit</h1>
            <span className="text-[11px] text-neutral-400 tracking-widest uppercase hidden sm:inline">
              Outfit Builder
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 hidden sm:block">
              <span className="text-neutral-400">@</span>
              <span className="font-medium ml-0.5">{user?.name}</span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-100 transition"
            >
              로그아웃
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-sm">
            <div className="border-b border-neutral-200/80 flex">
              <TabButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')}>
                코디 만들기
              </TabButton>
              <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')}>
                내 코디
              </TabButton>
            </div>
            <div className="p-6">
              {activeTab === 'builder' && <OutfitCanvas onOutfitSaved={loadOutfits} />}
              {activeTab === 'list' && <OutfitList />}
            </div>
          </div>

          <aside>
            <ImageUploader />
          </aside>
        </div>
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3.5 px-5 text-sm text-center font-medium transition relative ${
        active ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-px bg-neutral-900" />
      )}
    </button>
  );
}
