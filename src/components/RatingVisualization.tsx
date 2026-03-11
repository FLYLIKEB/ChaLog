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

const CHART_COLOR = 'rgb(34 197 94)'; // green-500 (차록 rating)
const GRID_COLOR = 'rgb(229 231 235)'; // gray-200
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

const FULL_MARK_5 = 5;
const FULL_MARK_10 = 10;

/** max점 척도 → 5점 환산 */
function toScore5(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(FULL_MARK_5, value * (FULL_MARK_5 / max));
}

/** max점 척도 → 10점 환산 */
function toScore10(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(FULL_MARK_10, value * (FULL_MARK_10 / max));
}

interface RatingVisualizationProps {
  use10Scale?: boolean;
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

export function RatingVisualization({ axisValues, use10Scale = false }: RatingVisualizationProps) {
  const sortedAxisValues = [...axisValues].sort((a, b) => {
    const orderA = a.axis?.displayOrder || 0;
    const orderB = b.axis?.displayOrder || 0;
    return orderA - orderB;
  });

  const fullMark = use10Scale ? FULL_MARK_10 : FULL_MARK_5;
  const toScore = use10Scale ? toScore10 : toScore5;

  const radarData = sortedAxisValues.map((av) => {
    const rawNum = Number(av.valueNumeric) || 0;
    const maxValue = Number(av.axis?.maxValue) || 5;
    const displayValue = use10Scale ? rawNum * (FULL_MARK_10 / maxValue) : rawNum;
    const displayMax = use10Scale ? FULL_MARK_10 : maxValue;
    return {
      subject: av.axis?.nameKo || `축 ${av.axisId}`,
      value: toScore(rawNum, maxValue),
      fullMark,
      rawValue: rawNum,
      maxValue,
      displayValue,
      displayMax,
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
                <span className="text-base truncate">{item.subject}</span>
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
              <span className="text-sm text-muted-foreground tabular-nums">
                {Number(item.displayValue).toFixed(1)}/{item.displayMax}
              </span>
            </div>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(item.rawValue / item.maxValue) * 100}%`,
                  backgroundColor: CHART_COLOR,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="aspect-square max-w-[300px] mx-auto p-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={radarData}
            margin={{ top: 36, right: 28, bottom: 28, left: 28 }}
            outerRadius="82%"
          >
            <PolarGrid stroke={GRID_COLOR} strokeOpacity={0.8} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: 'rgb(107 114 128)', fontSize: 12 }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={180}
              domain={[0, fullMark]}
              tick={{ fill: 'rgb(156 163 175)', fontSize: 11 }}
              tickCount={6}
              axisLine={false}
              tickLine={false}
            />
            <Radar
              name="평가"
              dataKey="value"
              stroke={CHART_COLOR}
              fill={CHART_COLOR}
              fillOpacity={0.15}
              strokeWidth={1.5}
              dot={{ r: 3.5, fill: 'rgb(5 46 22)', stroke: 'none' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-gray-900 border rounded-lg px-3 py-2 shadow-md text-sm" style={{ borderColor: 'rgb(34 197 94 / 0.5)' }}>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{p.subject}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                      {Number(p.displayValue).toFixed(1)}/{p.displayMax}점
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center text-sm text-gray-600 dark:text-gray-400">
        {radarData.map((item) => (
          <span key={item.subject} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLOR }} />
            {item.subject}
            <span className="font-medium tabular-nums text-gray-800 dark:text-gray-200">
              {Number(item.displayValue).toFixed(1)}/{item.displayMax}
            </span>
            {item.description?.trim() && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    aria-label={`${item.subject} 설명`}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" side="top" className="max-w-[240px] text-sm">
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
