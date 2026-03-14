import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Leaf, PenLine, Package, RefreshCw, Eye, EyeOff, CalendarDays } from 'lucide-react';
import { cn } from './ui/utils';
import { useAppMode } from '../contexts/AppModeContext';

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isToggle?: boolean;
  isActive?: boolean;
};

function useSpeedDialHide() {
  const { pathname } = useLocation();
  return (
    pathname === '/note/new' ||
    (pathname.startsWith('/note/') && pathname.endsWith('/edit')) ||
    pathname.startsWith('/session/') ||
    pathname === '/sessions' ||
    pathname.startsWith('/blind/') ||
    pathname === '/tea/new' ||
    pathname === '/teahouse/new' ||
    /^\/teahouse\/[^/]+\/edit$/.test(pathname) ||
    pathname === '/cellar' ||
    pathname === '/cellar/new' ||
    /^\/cellar\/\d+\/edit$/.test(pathname) ||
    pathname === '/chadam' ||
    pathname.startsWith('/chadam/') ||
    pathname === '/onboarding' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/find-email' ||
    pathname.startsWith('/admin')
  );
}

export function SpeedDialFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const shouldHide = useSpeedDialHide();
  const { sessionMode, blindMode, toggleSessionMode, toggleBlindMode } = useAppMode();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (shouldHide) return null;

  const navigateTo = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const menuItems: MenuItem[] = [
    {
      label: '차 추가',
      icon: <Leaf className="w-5 h-5" />,
      onClick: () => navigateTo('/tea/new'),
    },
    {
      label: '차록 작성',
      icon: <PenLine className="w-5 h-5" />,
      onClick: () => navigateTo('/note/new'),
    },
    {
      label: '찻장 추가',
      icon: <Package className="w-5 h-5" />,
      onClick: () => navigateTo('/cellar/new'),
    },
    {
      label: '차록 캘린더',
      icon: <CalendarDays className="w-5 h-5" />,
      onClick: () => navigateTo('/calendar'),
    },
    {
      label: '다회모드',
      icon: <RefreshCw className="w-5 h-5" />,
      onClick: toggleSessionMode,
      isToggle: true,
      isActive: sessionMode.active,
    },
    {
      label: '블라인드모드',
      icon: blindMode.active ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />,
      onClick: toggleBlindMode,
      isToggle: true,
      isActive: blindMode.active,
    },
  ];

  return (
    <>
      {/* 배경 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Speed Dial 컨테이너 */}
      <div
        className={cn('fixed right-6 z-50 flex flex-col items-end md:bottom-6', !isOpen && 'pointer-events-none')}
        style={{ bottom: 'calc(var(--bottom-nav-spacer) + 0.75rem)' }}
      >
        {/* 메뉴 아이템 (FAB 위쪽으로 펼침) */}
        <div className={cn('flex flex-col items-end gap-3 mb-3', !isOpen && 'pointer-events-none')}>
          {menuItems.map((item, index) => {
            // 아래(FAB에서 가까운) 항목일수록 먼저 나타남
            const delayMs = (menuItems.length - 1 - index) * 50;
            return (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-3 transition-all duration-200',
                  isOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-3 pointer-events-none',
                )}
                style={{ transitionDelay: isOpen ? `${delayMs}ms` : '0ms' }}
              >
                {/* 라벨 */}
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-background/95 shadow-sm border border-border text-foreground whitespace-nowrap">
                  {item.label}
                  {item.isToggle && item.isActive && (
                    <span className="ml-1 text-primary font-bold">ON</span>
                  )}
                </span>

                {/* 미니 FAB 버튼 */}
                <button
                  type="button"
                  aria-label={item.label}
                  onClick={item.onClick}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    item.isToggle && item.isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border border-border text-foreground hover:bg-muted',
                  )}
                >
                  {item.icon}
                </button>
              </div>
            );
          })}
        </div>

        {/* 메인 FAB */}
        <button
          type="button"
          aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="pointer-events-auto w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,185,60,0.35)] flex items-center justify-center transition-all hover:bg-primary/90 hover:shadow-[0_4px_16px_rgba(29,185,60,0.4)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <span
            className={cn(
              'transition-transform duration-300',
              isOpen ? 'rotate-45' : 'rotate-0',
            )}
          >
            <Plus className="w-6 h-6" />
          </span>
        </button>
      </div>
    </>
  );
}
