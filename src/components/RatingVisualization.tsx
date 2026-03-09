import { Info } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

/** 5점 척도 → 10점 환산 (value × 10/max, 예: 5점→10점) */
function toScore10(value: number, max: number): number {
  if (max <= 0) return 0;
  return value * (10 / max);
}

interface RatingVisualizationProps {
  axisValues: Array<{
    axisId: number;
    valueNumeric: number;
    axis?: {
      id: number;
      nameKo: string;
      nameEn: string;
      descriptionKo?: string | null;
      minValue?: number;
      maxValue: number;
      displayOrder: number;
    };
  }>;
}

export function RatingVisualization({ axisValues }: RatingVisualizationProps) {
  // displayOrder로 정렬
  const sortedAxisValues = [...axisValues].sort((a, b) => {
    const orderA = a.axis?.displayOrder || 0;
    const orderB = b.axis?.displayOrder || 0;
    return orderA - orderB;
  });

  return (
    <div className="space-y-3">
      {sortedAxisValues.map((axisValue) => {
        const maxValue = axisValue.axis?.maxValue || 5;
        const label = axisValue.axis?.nameKo || `축 ${axisValue.axisId}`;
        const value = axisValue.valueNumeric;
        const score10 = toScore10(value, maxValue);

        return (
          <div key={axisValue.axisId}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-sm truncate">{label}</span>
                {axisValue.axis?.descriptionKo?.trim() && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
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
                      <p className="text-muted-foreground">{axisValue.axis.descriptionKo}</p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground tabular-nums" aria-label="10점 환산">
                  {score10.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">{value}</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
