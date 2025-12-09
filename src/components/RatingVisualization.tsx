interface RatingVisualizationProps {
  axisValues: Array<{
    axisId: number;
    valueNumeric: number;
    axis?: {
      id: number;
      nameKo: string;
      nameEn: string;
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

        return (
          <div key={axisValue.axisId}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">{label}</span>
              <span className="text-sm text-gray-500">{value}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
