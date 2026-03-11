import React, { type FC } from 'react';
import { Star } from 'lucide-react';
import { cn } from './ui/utils';

interface StarRatingProps {
  value: number | null;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const STAR_COLOR = 'var(--rating)';

export const StarRating: FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
  size = 'md',
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const handleStarClick = (starValue: number, isHalf: boolean) => {
    if (disabled) return;
    const newValue = isHalf ? starValue - 0.5 : starValue;
    onChange(newValue);
  };

  return (
    <div className="flex w-full items-center justify-center gap-1" role="group" aria-label="평점 선택">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const fill = value !== null ? Math.max(0, Math.min(1, value - starValue + 1)) : 0;
        return (
          <button
            key={starValue}
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isLeft = e.clientX - rect.left < rect.width / 2;
              handleStarClick(starValue, isLeft);
            }}
            disabled={disabled}
            className={cn(
              'relative p-0.5 rounded transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              !disabled && 'hover:scale-110 active:scale-95 cursor-pointer',
              disabled && 'cursor-not-allowed opacity-60'
            )}
            aria-label={`${starValue - 0.5}~${starValue}점`}
          >
            <span className={cn('relative block', sizeClasses[size])}>
              <Star
                className={cn(sizeClasses[size], 'absolute inset-0 fill-none text-muted-foreground/40 stroke-muted-foreground/40')}
              />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className={cn(sizeClasses[size])}
                  style={{ fill: STAR_COLOR, stroke: STAR_COLOR }}
                />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
