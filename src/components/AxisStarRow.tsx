import React, { type FC, useState } from 'react';
import { Info, Star } from 'lucide-react';
import { Slider } from './ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { cn } from './ui/utils';

const MIN = 1;
const MAX = 5;
const STEP = 0.25;
const STAR_COLOR = 'var(--rating)';

/** 5점 척도 → 10점 환산 (value × 10/max, 예: 5점→10점) */
function toScore10(value: number, max: number): number {
  if (max <= 0) return 0;
  return value * (10 / max);
}

interface AxisStarRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** 축별 설명 (있으면 Info 아이콘으로 도움말 표시) */
  description?: string | null;
  /** 축 최소값 (10점 환산용, 기본 1) */
  minValue?: number;
  /** 축 최대값 (10점 환산용, 기본 5) */
  maxValue?: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(v / STEP) * STEP));
}

export const AxisStarRow: FC<AxisStarRowProps> = ({
  label,
  value,
  onChange,
  description,
  minValue = MIN,
  maxValue = MAX,
}) => {
  const validatedValue = clamp(value, minValue, maxValue);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleStarClick = (starValue: number, isHalf: boolean) => {
    const v = isHalf ? starValue - 0.5 : starValue;
    onChange(clamp(v, minValue, maxValue));
  };

  return (
    <>
      <style>{`
        .axis-star-row [data-slot="slider-thumb"] {
          width: 14px !important;
          height: 14px !important;
          border-width: 2px !important;
          border-color: white !important;
          background-color: ${STAR_COLOR} !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15) !important;
        }
        .axis-star-row [data-slot="slider-track"] {
          height: 5px !important;
          background-color: #e5e7eb !important;
          border-radius: 3px !important;
        }
        .axis-star-row [data-slot="slider-range"] {
          background-color: ${STAR_COLOR} !important;
          border-radius: 3px !important;
        }
      `}</style>
      <div className="axis-star-row flex flex-col gap-2 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-16 shrink-0 items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">{label}</span>
            {description && description.trim() && (
              <Popover open={helpOpen} onOpenChange={setHelpOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    aria-label={`${label} 설명 보기`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  className="max-w-[280px] text-sm"
                >
                  <p className="text-muted-foreground">{description}</p>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={`${label} 평점`}>
            {Array.from({ length: maxValue - minValue + 1 }, (_, i) => minValue + i).map((starValue) => {
              const fill = Math.max(0, Math.min(1, validatedValue - starValue + 1));
              return (
                <button
                  key={starValue}
                  type="button"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const isLeft = e.clientX - rect.left < rect.width / 2;
                    handleStarClick(starValue, isLeft);
                  }}
                  className={cn(
                    'relative p-0.5 rounded transition-all duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-offset-1',
                    'hover:scale-110 active:scale-95 cursor-pointer'
                  )}
                  aria-label={`${starValue - 0.5}~${starValue}점`}
                >
                  <span className="relative block w-5 h-5">
                    <Star
                      className="w-5 h-5 absolute inset-0 fill-none text-gray-300 stroke-gray-300"
                      strokeWidth={1.5}
                    />
                    <span
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: `${fill * 100}%` }}
                    >
                      <Star
                        className="w-5 h-5"
                        style={{ fill: STAR_COLOR, stroke: STAR_COLOR }}
                        strokeWidth={1.5}
                      />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-baseline gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground tabular-nums" aria-label="10점 환산">
              {toScore10(validatedValue, maxValue).toFixed(1)}
            </span>
            <span className="w-9 text-right text-sm font-semibold tabular-nums text-foreground">
              {validatedValue.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-16">
          <Slider
            value={[validatedValue]}
            onValueChange={(v) => onChange(clamp(v[0], minValue, maxValue))}
            min={minValue}
            max={maxValue}
            step={STEP}
            className="flex-1 min-w-0"
          />
        </div>
      </div>
    </>
  );
}
