import { Info } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

const FULL_MARK = 5;

/** max점 척도 → 5점 환산 */
function toScore5(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(FULL_MARK, value * (FULL_MARK / max));
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
  const sortedAxisValues = [...axisValues].sort((a, b) => {
    const orderA = a.axis?.displayOrder || 0;
    const orderB = b.axis?.displayOrder || 0;
    return orderA - orderB;
  });

  const radarData = sortedAxisValues.map((av) => {
    const maxValue = av.axis?.maxValue || 5;
    return {
      subject: av.axis?.nameKo || `축 ${av.axisId}`,
      value: toScore5(av.valueNumeric, maxValue),
      fullMark: FULL_MARK,
      rawValue: av.valueNumeric,
      maxValue,
      description: av.axis?.descriptionKo,
    };
  });

  if (radarData.length === 0) return null;

  // 축이 1~2개면 바형 유지 (레이더는 3개 이상에서 의미 있음)
  if (radarData.length < 3) {
    return (
      <div className="space-y-3">
        {radarData.map((item) => (
          <div key={item.subject}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-sm truncate">{item.subject}</span>
                {item.description?.trim() && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        aria-label={`${item.subject} 설명 보기`}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" side="top" className="max-w-[280px] text-sm">
                      <p className="text-muted-foreground">{item.description}</p>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {item.rawValue}/{item.maxValue}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                style={{ width: `${(item.rawValue / item.maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square max-w-[280px] mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
            <PolarGrid stroke="rgb(167 243 208)" strokeOpacity={0.6} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, FULL_MARK]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickCount={6}
            />
            <Radar
              name="평가"
              dataKey="value"
              stroke="rgb(16 185 129)"
              fill="rgb(16 185 129)"
              fillOpacity={0.22}
              strokeWidth={2}
              strokeOpacity={0.9}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-background/95 backdrop-blur border border-emerald-200/60 dark:border-emerald-800/50 rounded-lg px-3 py-2 shadow-lg text-sm">
                    <p className="font-medium text-foreground">{p.subject}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {p.rawValue}/{p.maxValue}점
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs text-muted-foreground">
        {radarData.map((item) => (
          <span key={item.subject} className="flex items-center gap-1">
            {item.subject} {item.rawValue}/{item.maxValue}
            {item.description?.trim() && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted hover:text-foreground"
                    aria-label={`${item.subject} 설명`}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" side="top" className="max-w-[240px] text-xs">
                  <p className="text-muted-foreground">{item.description}</p>
                </PopoverContent>
              </Popover>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
