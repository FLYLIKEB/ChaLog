import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const dismissedAt = Number(dismissed);
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (navigator as unknown as { standalone: boolean }).standalone)
  );
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

export function PWAInstallBanner() {
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBanner, setShowAndroidBanner] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    // iOS Safari 감지
    if (isIOS()) {
      setShowIOSBanner(true);
      return;
    }

    // Android/Chrome: beforeinstallprompt 이벤트
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowIOSBanner(false);
    setShowAndroidBanner(false);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroidBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (showIOSBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <img src="/logo.png" alt="차멍" className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">차멍 앱 설치하기</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                <Share className="w-3.5 h-3.5 inline-block align-text-bottom mr-0.5" />
                <span> 공유 버튼을 누른 뒤 </span>
                <PlusSquare className="w-3.5 h-3.5 inline-block align-text-bottom mr-0.5" />
                <span className="font-medium"> 홈 화면에 추가</span>를 선택하세요
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 -m-1 text-muted-foreground hover:text-foreground"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAndroidBanner) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300">
        <div className="bg-card border border-border rounded-2xl shadow-lg p-4 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="차멍" className="w-10 h-10 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">차멍 앱 설치하기</p>
              <p className="text-xs text-muted-foreground mt-0.5">홈 화면에 추가하여 앱처럼 사용하세요</p>
            </div>
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 -m-1 text-muted-foreground hover:text-foreground"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleAndroidInstall}
            className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            설치하기
          </button>
        </div>
      </div>
    );
  }

  return null;
}
