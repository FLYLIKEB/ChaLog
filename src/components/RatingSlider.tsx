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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm">{label}</label>
        <span className="text-sm text-gray-500">{validatedValue}</span>
      </div>
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
  );
}
