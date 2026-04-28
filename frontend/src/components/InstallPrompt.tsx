'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'dragfit:install-dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(DISMISS_KEY) === '1') {
      setHidden(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    const installedHandler = () => setDeferred(null);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  if (!deferred || hidden) return null;

  const handleInstall = async () => {
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferred(null);
      }
    } catch (e) {
      console.error('install prompt failed', e);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-sm z-40 bg-neutral-900 text-white rounded-2xl shadow-2xl border border-white/10 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-white text-neutral-900 flex items-center justify-center font-bold text-base shrink-0">
          D
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">DragFit 앱으로 설치하기</p>
          <p className="text-[12px] text-white/70 mt-0.5 leading-snug">
            홈화면에 추가하면 브라우저 없이 바로 코디를 만들 수 있습니다.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={handleInstall}
          className="flex-1 py-2 bg-white text-neutral-900 text-sm font-medium rounded-lg hover:bg-neutral-100 transition"
        >
          설치
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3 py-2 text-sm text-white/70 hover:text-white transition"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
