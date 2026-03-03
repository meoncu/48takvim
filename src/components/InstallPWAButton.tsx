'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;

    const hiddenUntil = Number(window.localStorage.getItem('takvim-pwa-install-hidden-until') ?? '0');
    return hiddenUntil > Date.now();
  });
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  });

  useEffect(() => {

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;

    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  const isMobile = useMemo(() => {
    if (typeof navigator === 'undefined') return false;

    return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  }, []);

  const dismissInstallPrompt = () => {
    if (typeof window !== 'undefined') {
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem('takvim-pwa-install-hidden-until', String(Date.now() + threeDays));
    }

    setDismissed(true);
    setDeferredPrompt(null);
  };

  if (!isMobile || isStandalone || dismissed) return null;

  if (isIOS) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm">
        <span>Yükle</span>
        <button
          type="button"
          onClick={dismissInstallPrompt}
          className="grid h-5 w-5 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Yükleme ipucunu gizle"
        >
          ×
        </button>
      </div>
    );
  }

  if (!deferredPrompt) return null;

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={async () => {
          await deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          setDeferredPrompt(null);

          if (choice.outcome !== 'accepted') {
            dismissInstallPrompt();
          }
        }}
        className="min-h-10 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition active:scale-[0.98] hover:from-blue-500 hover:to-violet-500"
      >
        Uygulamayı Yükle
      </button>
      <button
        type="button"
        onClick={dismissInstallPrompt}
        className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-label="Yükleme butonunu gizle"
      >
        ×
      </button>
    </div>
  );
}
