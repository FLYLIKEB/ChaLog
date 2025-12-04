import { Slider } from './ui/slider';
import { RATING_MIN, RATING_MAX } from '../constants';

interface RatingSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function RatingSlider({ label, value, onChange }: RatingSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm">{label}</label>
        <span className="text-sm text-gray-500">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(values) => onChange(values[0])}
        min={RATING_MIN}
        max={RATING_MAX}
        step={0.5}
        className="w-full"
      />
    </div>
  );
}
