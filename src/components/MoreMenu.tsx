import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bookmark, Clock, EyeOff, Settings, CalendarDays, Search, Bell } from 'lucide-react';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';

interface MoreMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoreMenu({ open, onOpenChange }: MoreMenuProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === '/sessions') return pathname === '/sessions' || pathname.startsWith('/session/');
    if (path === '/blind/new') return pathname.startsWith('/blind/');
    return pathname === path;
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const menuItems = [
    { path: '/sasaek', label: '탐색', icon: Search },
    ...(isAuthenticated ? [{ path: '/notifications', label: '알림', icon: Bell }] : []),
    { path: '/saved', label: '저장함', icon: Bookmark },
    { path: '/calendar', label: '차록 캘린더', icon: CalendarDays },
    { path: '/sessions', label: '시음 세션', icon: Clock },
    { path: '/blind/new', label: '블라인드 테이스팅', icon: EyeOff },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="z-70">
        <DrawerHeader>
          <DrawerTitle>더보기</DrawerTitle>
        </DrawerHeader>
        <div className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {menuItems.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              onClick={() => handleNavigate(path)}
              className={cn(
                'flex w-full items-center gap-3 py-3 px-6',
                isActive(path) ? 'text-primary font-medium' : 'text-foreground',
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
          <div className="mx-6 my-1 border-t border-border" />
          <button
            onClick={() => handleNavigate('/settings')}
            className={cn(
              'flex w-full items-center gap-3 py-3 px-6',
              isActive('/settings') ? 'text-primary font-medium' : 'text-foreground',
            )}
          >
            <Settings className="w-5 h-5" />
            설정
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
