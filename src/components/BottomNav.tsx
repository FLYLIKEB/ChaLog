import { HTMLAttributes } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from './ui/utils';

type BottomNavItem = {
  label: string;
  path: string;
  isActive?: (pathname: string) => boolean;
};

const NAV_ITEMS: BottomNavItem[] = [
  { label: '홈', path: '/' },
  { label: '검색', path: '/search' },
  { label: '내 노트', path: '/my-notes' },
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

        return (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className={cn(
              'min-h-[44px] min-w-[44px] flex flex-col items-center justify-center gap-1 transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            <div
              className={cn(
                'w-6 h-6',
                isActive && 'rounded-full bg-accent flex items-center justify-center',
              )}
            />
            <span className="text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

