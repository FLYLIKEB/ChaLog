import React from 'react';
import { Bell, User, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useNotificationCount } from '../hooks/useNotificationCount';

export function DesktopHeader() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toggle } = useSidebar();
  const unreadCount = useNotificationCount();

  return (
    <header className="hidden md:flex items-center justify-between px-6 h-14 shrink-0 border-b border-border/50 bg-card/80 backdrop-blur-md">
      {/* 왼쪽: 사이드바 토글 */}
      <button
        type="button"
        onClick={toggle}
        aria-label="사이드바 토글"
        className="p-2 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 오른쪽: 알림 + 프로필 */}
      <div className="flex items-center gap-1">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            aria-label="알림"
            className="relative p-2 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(isAuthenticated ? '/settings' : '/login')}
          aria-label="프로필"
          className="p-2 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
