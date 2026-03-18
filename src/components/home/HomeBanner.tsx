import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, PenLine } from 'lucide-react';
import { CtaButton } from '@/components/ui/CtaButton';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/components/ui/utils';

const DISMISS_KEY = 'chalog-banner-dismissed';

function isDismissed(): boolean {
  const val = localStorage.getItem(DISMISS_KEY);
  if (!val) return false;
  const ts = parseInt(val, 10);
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

export function HomeBanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(isDismissed);

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="relative rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 p-4 md:p-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
          <img src="/logo.png" alt="" className="w-8 h-8 object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {user ? `${user.name}님, 오늘 차 한 잔 어때요?` : '오늘의 차를 기록해보세요'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            매일 차록을 남기면 나만의 취향을 발견할 수 있어요.
          </p>
        </div>
      </div>
      <CtaButton onClick={() => navigate('/note/new')} icon={PenLine} label="차록 쓰기" variant="primary" />
    </div>
  );
}
