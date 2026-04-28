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
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Fashion Coordinator</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              안녕하세요, <span className="font-medium">{user?.name}</span>님
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200 flex">
              <TabButton active={activeTab === 'builder'} onClick={() => setActiveTab('builder')}>
                코디 만들기
              </TabButton>
              <TabButton active={activeTab === 'list'} onClick={() => setActiveTab('list')}>
                내 코디 목록
              </TabButton>
            </div>
            <div className="p-5">
              {activeTab === 'builder' && <OutfitCanvas onOutfitSaved={loadOutfits} />}
              {activeTab === 'list' && <OutfitList />}
            </div>
          </div>

          <div>
            <ImageUploader />
          </div>
        </div>
      </div>
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
      className={`flex-1 py-3 px-5 text-center font-medium transition ${
        active
          ? 'border-b-2 border-blue-500 text-blue-600'
          : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  );
}
