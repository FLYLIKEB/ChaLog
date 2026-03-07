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

  return (
    <div className="flex w-full items-center justify-center gap-1" role="group" aria-label="평점 선택">
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const isFilled = value !== null && starValue <= value;
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => !disabled && onChange(starValue)}
            disabled={disabled}
            className={cn(
              'p-0.5 rounded transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              !disabled && 'hover:scale-110 active:scale-95 cursor-pointer',
              disabled && 'cursor-not-allowed opacity-60'
            )}
            aria-label={`${starValue}점`}
            aria-pressed={isFilled}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors',
                isFilled
                  ? 'fill-rating text-rating'
                  : 'fill-none text-muted-foreground/40 stroke-muted-foreground/40'
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
