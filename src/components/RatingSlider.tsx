import { Slider } from './ui/slider';
import { RATING_MIN, RATING_MAX } from '../constants';

interface RatingSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function RatingSlider({ label, value, onChange }: RatingSliderProps) {
  // value가 최소값보다 작으면 최소값으로 보정
  const validatedValue = Math.max(RATING_MIN, Math.min(RATING_MAX, value));
  
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
              // 최소값과 최대값 사이로 제한
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
