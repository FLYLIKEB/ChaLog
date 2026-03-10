import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, BookMarked, Wine, ChevronLeft, ChevronRight, Bell, Settings } from 'lucide-react';
import { cn } from './ui/utils';
import { useSidebar } from '../contexts/SidebarContext';

type NavItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { path: '/', label: '홈', icon: Home },
  { path: '/sasaek', label: '사색', icon: Search },
  { path: '/chadam', label: '차담', icon: MessageCircle },
  { path: '/my-notes', label: '내 차록', icon: BookMarked },
  { path: '/cellar', label: '찻장', icon: Wine },
];

export function AppSidebar() {
  const location = useLocation();
  const { isExpanded, toggle } = useSidebar();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden transition-all duration-200',
        isExpanded ? 'w-56' : 'w-12',
      )}
    >
      {/* 로고/브랜드 + 토글 버튼 */}
      <div className={cn('flex items-center border-b border-sidebar-border shrink-0 h-14', isExpanded ? 'px-4 justify-between' : 'justify-center')}>
        {isExpanded && (
          <Link
            to="/"
            className="text-lg font-bold text-sidebar-foreground hover:text-sidebar-primary transition-colors truncate"
          >
            ChaLog
          </Link>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={isExpanded ? '사이드바 접기' : '사이드바 펼치기'}
          className="flex items-center justify-center w-7 h-7 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors shrink-0"
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            title={!isExpanded ? label : undefined}
            className={cn(
              'flex items-center gap-3 py-2.5 rounded-lg mb-1 transition-colors',
              isExpanded ? 'px-3 mx-2' : 'justify-center px-0 mx-1',
              isActive(path)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate text-sm">{label}</span>}
          </Link>
        ))}
      </nav>

      {/* 하단: 알림, 설정 */}
      <div className={cn('py-2 border-t border-sidebar-border overflow-hidden', isExpanded ? 'px-2' : 'px-1')}>
        {[
          { path: '/notifications', label: '알림', Icon: Bell },
          { path: '/settings', label: '설정', Icon: Settings },
        ].map(({ path, label, Icon }) => (
          <Link
            key={path}
            to={path}
            title={!isExpanded ? label : undefined}
            className={cn(
              'flex items-center gap-3 py-2.5 rounded-lg transition-colors mb-1',
              isExpanded ? 'px-3' : 'justify-center px-0',
              isActive(path)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate text-sm">{label}</span>}
          </Link>
        ))}
      </div>
    </aside>
  );
}
