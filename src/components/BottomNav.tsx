import { HTMLAttributes, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, FileText, MessageSquare, Package, MoreHorizontal } from 'lucide-react';
import { cn } from './ui/utils';
import { MoreMenu } from './MoreMenu';

type BottomNavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  activeStyle?: 'fill' | 'bold';
  isActive?: (pathname: string) => boolean;
};

const NAV_ITEMS: BottomNavItem[] = [
  { label: '홈', path: '/', icon: Home, activeStyle: 'fill' },
  { label: '탐색', path: '/sasaek', icon: Search, activeStyle: 'bold' },
  {
    label: '차담',
    path: '/chadam',
    icon: MessageSquare,
    activeStyle: 'bold',
    isActive: (pathname) => pathname === '/chadam' || pathname.startsWith('/chadam/'),
  },
  {
    label: '내 차록',
    path: '/my-notes',
    icon: FileText,
    activeStyle: 'bold',
    isActive: (pathname) => pathname === '/my-notes' || pathname.startsWith('/user/'),
  },
  {
    label: '찻장',
    path: '/cellar',
    icon: Package,
    activeStyle: 'bold',
    isActive: (pathname) => pathname === '/cellar' || pathname.startsWith('/cellar/'),
  },
];

const MORE_PATHS = ['/saved', '/sessions', '/settings'];
const isMoreActive = (pathname: string) =>
  MORE_PATHS.includes(pathname) ||
  pathname.startsWith('/session/') ||
  pathname.startsWith('/blind/');

type BottomNavProps = HTMLAttributes<HTMLElement>;

export function BottomNav({ className, ...rest }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNavigate = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <>
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-60 bg-card/95 backdrop-blur-md border-t border-black/5 rounded-t-2xl card-shadow-top px-2 py-3',
          'pb-[calc(0.75rem+env(safe-area-inset-bottom))]',
          'flex items-center justify-around',
          'md:hidden',
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
                'min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground',
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
                  className={cn('w-5 h-5 transition-all duration-200', isActive && 'text-primary')}
                  fill={fill}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95',
            isMoreActive(location.pathname) ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-label="더보기"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <MoreHorizontal
              className={cn(
                'w-5 h-5 transition-all duration-200',
                isMoreActive(location.pathname) && 'text-primary',
              )}
              stroke="currentColor"
              strokeWidth={isMoreActive(location.pathname) ? 2.75 : 2}
            />
          </div>
          <span className="text-xs font-medium">더보기</span>
        </button>
      </nav>
      <MoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
