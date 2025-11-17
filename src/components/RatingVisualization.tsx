interface RatingVisualizationProps {
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };
}

export function RatingVisualization({ ratings }: RatingVisualizationProps) {
  const labels = {
    richness: '풍부함',
    strength: '강도',
    smoothness: '부드러움',
    clarity: '깨끗함',
    complexity: '복합성',
  };

  return (
    <div className="space-y-3">
      {Object.entries(ratings).map(([key, value]) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm">{labels[key as keyof typeof labels]}</span>
            <span className="text-sm text-gray-500">{value}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all"
              style={{ width: `${(value / 5) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
