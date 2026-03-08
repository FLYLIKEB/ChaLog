import { Slider } from './ui/slider';
import { RATING_MIN, RATING_MAX } from '../constants';
import { cn } from './ui/utils';

interface RatingSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

export function RatingSlider({ label, value, onChange, compact = false }: RatingSliderProps) {
  const validatedValue = Math.max(RATING_MIN, Math.min(RATING_MAX, value));

  if (compact) {
    return (
      <>
        <style>{`
          .rating-slider-compact [data-slot="slider-thumb"] {
            width: 16px !important;
            height: 16px !important;
            border-width: 2px !important;
            border-color: white !important;
            background-color: var(--primary) !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15) !important;
          }
          .rating-slider-compact [data-slot="slider-track"] {
            height: 6px !important;
            background-color: #e5e7eb !important;
            border-radius: 3px !important;
          }
          .rating-slider-compact [data-slot="slider-range"] {
            background-color: var(--primary) !important;
            border-radius: 3px !important;
          }
        `}</style>
        <div className={cn('rating-slider-compact flex items-center gap-3 py-2')}>
          <label className="min-w-16 shrink-0 text-sm font-medium text-foreground">
            {label}
          </label>
          <div className="flex-1 min-w-0">
            <Slider
              value={[validatedValue]}
              onValueChange={(values) => {
                const newValue = Math.max(RATING_MIN, Math.min(RATING_MAX, values[0]));
                onChange(newValue);
              }}
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.5}
              className="w-full"
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
            {validatedValue.toFixed(1)}
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .rating-slider [data-slot="slider-thumb"] {
          width: 20px !important;
          height: 20px !important;
          border-width: 3px !important;
          border-color: white !important;
          background-color: var(--primary) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08) !important;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .rating-slider [data-slot="slider-thumb"]:active {
          transform: scale(1.15) !important;
        }
        .rating-slider [data-slot="slider-track"] {
          height: 4px !important;
          background-color: #f3f4f6 !important;
          border-radius: 2px !important;
        }
        .rating-slider [data-slot="slider-range"] {
          background-color: var(--primary) !important;
          border-radius: 2px !important;
          transition: width 0.15s ease-out !important;
        }
      `}</style>
      <div className="py-3 rating-slider">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-900">{label}</label>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">
            {validatedValue.toFixed(1)}
          </span>
        </div>
        <div className="px-0.5">
          <Slider
            value={[validatedValue]}
            onValueChange={(values) => {
              const newValue = Math.max(RATING_MIN, Math.min(RATING_MAX, values[0]));
              onChange(newValue);
            }}
            min={RATING_MIN}
            max={RATING_MAX}
            step={0.5}
            className="w-full"
          />
        </div>
        <div className="flex justify-between mt-2 px-0.5">
          <span className="text-[10px] text-gray-400 font-medium">{RATING_MIN}</span>
          <span className="text-[10px] text-gray-400 font-medium">{RATING_MAX}</span>
        </div>
      </div>
    </>
  );
}
