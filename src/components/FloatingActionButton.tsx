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
  default: 'bottom-6', // 1.5rem = 24px
  aboveNav: 'md:bottom-6', // 데스크톱: 24px (BottomNav 없음), 모바일은 style로 처리
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
        'fixed right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,185,60,0.35)] flex items-center justify-center transition-all hover:bg-primary/90 hover:shadow-[0_4px_16px_rgba(29,185,60,0.4)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        positionClasses[position],
        className
      )}
      style={position === 'aboveNav' ? {
        bottom: 'calc(var(--bottom-nav-spacer) + 0.75rem)',
      } : undefined}
    >
      {children}
    </button>
  );
}

