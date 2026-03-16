import React, { useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { authApi } from '../lib/api';
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface EmailVerificationBannerProps {
  className?: string;
}

export function EmailVerificationBanner({ className }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendVerification();
      toast.success('인증 메일이 재발송되었습니다. 이메일을 확인해주세요.');
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err.message || '재발송에 실패했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-sm',
        className,
      )}
    >
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <span className="flex-1 text-amber-800 dark:text-amber-200">
        이메일 인증이 필요합니다.
      </span>
      <button
        onClick={handleResend}
        disabled={isResending}
        className="flex items-center gap-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium whitespace-nowrap disabled:opacity-50"
      >
        {isResending ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            발송 중
          </>
        ) : (
          '인증 메일 재발송'
        )}
      </button>
      <button
        onClick={() => setIsDismissed(true)}
        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
