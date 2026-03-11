import React from 'react';
import { User, ChevronLeft, Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChaLogLogo } from './ChaLogLogo';
import { useNotificationCount } from '../hooks/useNotificationCount';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  /** 커스텀 뒤로가기 동작 (미제공 시 navigate(-1)) */
  onBack?: () => void;
  showProfile?: boolean;
  /** 차멍 로고 표시 (메인 탭 등에서 브랜딩용, 클릭 시 홈으로) */
  showLogo?: boolean;
}

export function Header({ title, showBack, onBack, showProfile, showLogo }: HeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const unreadCount = useNotificationCount();

  const headerHeight = 'var(--header-spacer)';

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-100 bg-card/95 backdrop-blur-md border-b border-black/5 rounded-b-2xl py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showBack && (
              <button
                onClick={() => (onBack ? onBack() : navigate(-1))}
                className="shrink-0 min-h-[44px] min-w-[44px] p-2.5 -ml-1 hover:bg-muted/60 rounded-full transition-colors flex items-center justify-center active:scale-95 text-foreground"
                aria-label="뒤로"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {(showLogo || (!title && !showBack) || showBack) && (
              <ChaLogLogo
                iconOnly={!!title}
                asButton
                onClick={() => navigate('/')}
              />
            )}
            {title && (
              <h1 className="text-foreground font-semibold tracking-tight truncate min-w-0">
                {title}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => navigate('/sasaek')}
              className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-muted/60 rounded-full transition-colors flex items-center justify-center active:scale-95"
              aria-label="탐색"
            >
              <Search className="w-5 h-5" />
            </button>
            {isAuthenticated && (
              <button
                onClick={() => navigate('/notifications')}
                className="relative min-h-[44px] min-w-[44px] p-2.5 hover:bg-muted/60 rounded-full transition-colors flex items-center justify-center active:scale-95"
                aria-label="알림"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            {showProfile && (
              <button
                onClick={() => navigate(isAuthenticated ? '/settings' : '/login')}
                className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-muted/60 rounded-full transition-colors flex items-center justify-center active:scale-95"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 고정 헤더 높이만큼 스페이서 - 콘텐츠가 헤더와 겹치지 않도록 (모바일 전용) */}
      <div
        className="md:hidden shrink-0 w-full"
        style={{ height: headerHeight, minHeight: headerHeight }}
        aria-hidden
      />
    </>
  );
}
