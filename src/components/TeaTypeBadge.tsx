import React, { type FC } from 'react';
import { TEA_TYPE_COLORS, TEA_TYPE_TEXT_COLORS } from '../constants';
import { cn } from './ui/utils';

interface TeaTypeBadgeProps {
  type: string;
  className?: string;
  /** pill: rounded-full 배경, dot: 색 점+텍스트 */
  variant?: 'pill' | 'dot';
}

export const TeaTypeBadge: FC<TeaTypeBadgeProps> = ({ type, className, variant = 'dot' }) => {
  const colorClass =
    type in TEA_TYPE_COLORS ? TEA_TYPE_COLORS[type as keyof typeof TEA_TYPE_COLORS] : 'bg-muted-foreground/50';
  const textClass =
    type in TEA_TYPE_TEXT_COLORS ? TEA_TYPE_TEXT_COLORS[type as keyof typeof TEA_TYPE_TEXT_COLORS] : 'text-muted-foreground';

  if (variant === 'pill') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium bg-secondary',
          textClass,
          className,
        )}
      >
        <span className={cn('w-2 h-2 rounded-full shrink-0', colorClass)} aria-hidden />
        {type}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 shrink-0 text-xs', textClass, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', colorClass)} aria-hidden />
      {type}
    </span>
  );
};
