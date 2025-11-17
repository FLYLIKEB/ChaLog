import { Slider } from './ui/slider';

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
        min={0}
        max={5}
        step={0.5}
        className="w-full"
      />
    </div>
  );
}
