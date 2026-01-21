import { HTMLAttributes } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, FileText, Bookmark } from 'lucide-react';
import { cn } from './ui/utils';

type BottomNavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  activeStyle?: 'fill' | 'bold';
  isActive?: (pathname: string) => boolean;
};

const NAV_ITEMS: BottomNavItem[] = [
  { label: '홈', path: '/', icon: Home, activeStyle: 'fill' },
  { label: '검색', path: '/search', icon: Search, activeStyle: 'bold' },
  {
    label: '내 노트',
    path: '/my-notes',
    icon: FileText,
    activeStyle: 'bold',
    isActive: (pathname) => pathname === '/my-notes' || pathname.startsWith('/user/'),
  },
  { label: '저장함', path: '/saved', icon: Bookmark, activeStyle: 'fill' },
];

type BottomNavProps = HTMLAttributes<HTMLElement>;

export function BottomNav({ className, ...rest }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3',
        'pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
        'flex items-center justify-around',
        className,
      )}
      {...rest}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.isActive
          ? item.isActive(location.pathname)
          : location.pathname === item.path;
        const Icon = item.icon;
        const isBoldActive = isActive && item.activeStyle === 'bold';
        const isFillActive = isActive && item.activeStyle === 'fill';
        const strokeWidth = isBoldActive ? 2.75 : 2;
        const fill = isFillActive ? 'currentColor' : 'none';
        return (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className={cn(
              'min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 transition-colors',
              isActive ? 'text-black' : 'text-muted-foreground',
            )}
            aria-label={item.label}
          >
            <div
              className={cn(
                'w-6 h-6 flex items-center justify-center',
                isActive && 'rounded-full',
              )}
            >
              <Icon
                className={cn('w-5 h-5', isActive && 'text-black')}
                fill={fill}
                stroke="currentColor"
                strokeWidth={strokeWidth}
              />
            </div>
            <span className="text-xs sm:text-xs font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
