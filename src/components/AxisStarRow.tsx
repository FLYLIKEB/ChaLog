import React, { type FC, useRef, useState } from 'react';
import { Info, Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

const MIN = 1;
const MAX = 5;
const STEP = 0.25;
const STAR_COLOR = 'var(--rating)';

interface AxisStarRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  description?: string | null;
  minValue?: number;
  maxValue?: number;
  displayMultiplier?: number;
}

function snapToStep(v: number, min: number, max: number): number {
  const snapped = Math.round(v / STEP) * STEP;
  return Math.max(min, Math.min(max, snapped));
}

export const AxisStarRow: FC<AxisStarRowProps> = ({
  label,
  value,
  onChange,
  description,
  minValue = MIN,
  maxValue = MAX,
  displayMultiplier = 1,
}) => {
  const starCount = maxValue - minValue + 1;
  const validatedValue = snapToStep(value, minValue, maxValue);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const valueFromPointer = (clientX: number): number => {
    if (!rowRef.current) return validatedValue;
    const rect = rowRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapToStep(minValue + fraction * (maxValue - minValue), minValue, maxValue);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    onChange(valueFromPointer(e.clientX));
  };

  const handlePointerUp = () => setDragging(false);

  return (
    <div className="flex items-center gap-3 py-2.5 px-0">
      {/* 라벨 */}
      <div className="flex w-16 shrink-0 items-center gap-1">
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        {description?.trim() && (
          <Popover open={helpOpen} onOpenChange={setHelpOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={`${label} 설명`}
              >
                <Info className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="max-w-[260px] text-sm">
              <p className="text-muted-foreground">{description}</p>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* 점수 */}
      <span className="w-9 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {(() => {
          const d = validatedValue * displayMultiplier;
          return d % 1 === 0 ? d.toFixed(0) : d.toString();
        })()}
      </span>

      {/* 드래그 가능한 별점 영역 */}
      <div
        ref={rowRef}
        className={cn(
          'flex items-center gap-1 select-none touch-none',
          dragging ? 'cursor-grabbing' : 'cursor-pointer',
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="slider"
        aria-label={`${label} 평점`}
        aria-valuenow={validatedValue}
        aria-valuemin={minValue}
        aria-valuemax={maxValue}
      >
        {Array.from({ length: starCount }, (_, i) => {
          const starValue = minValue + i;
          // 0, 0.25, 0.5, 0.75, 1.0 중 하나로 스냅
          const rawFill = Math.max(0, Math.min(1, validatedValue - starValue + 1));
          const fill = Math.round(rawFill / 0.25) * 0.25;
          return (
            <span key={starValue} className="relative w-6 h-6 shrink-0">
              <Star
                className="absolute inset-0 w-6 h-6 fill-none text-muted-foreground/30"
                strokeWidth={1.5}
              />
              {fill > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fill * 100}%` }}
                >
                  <Star
                    className="w-6 h-6 shrink-0"
                    style={{ fill: STAR_COLOR, stroke: STAR_COLOR }}
                    strokeWidth={1.5}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};
