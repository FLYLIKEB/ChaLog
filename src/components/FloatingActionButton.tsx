import React, { ReactNode } from 'react';
import { cn } from './ui/utils';

type FloatingActionButtonProps = {
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  position?: 'default' | 'aboveNav';
  children?: ReactNode;
};

const positionClasses: Record<NonNullable<FloatingActionButtonProps['position']>, string> = {
  default: 'bottom-6',
  aboveNav: 'bottom-20',
};

export function FloatingActionButton({
  onClick,
  ariaLabel = '새 항목 추가',
  className,
  position = 'default',
  children,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'fixed right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'mb-[env(safe-area-inset-bottom)]',
        positionClasses[position],
        className
      )}
    >
      {children}
    </button>
  );
}


