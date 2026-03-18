import React from 'react';
import { AxisStarRow } from './AxisStarRow';
import { RatingAxis, RatingSchema } from '../types';
import { RATING_DEFAULT } from '../constants';

interface AxisRatingSectionProps {
  selectedSchemaIds: number[];
  axes: RatingAxis[];
  schemas: RatingSchema[];
  axisValues: Record<number, number>;
  onAxisChange: (axisId: number, value: number) => void;
  displayMultiplier?: number;
}

export function AxisRatingSection({
  selectedSchemaIds,
  axes,
  schemas,
  axisValues,
  onAxisChange,
  displayMultiplier = 1,
}: AxisRatingSectionProps) {
  if (selectedSchemaIds.length === 0 || axes.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {selectedSchemaIds.map((schemaId) => {
        const schemaAxes = axes
          .filter((a) => a.schemaId === schemaId)
          .sort((a, b) => a.displayOrder - b.displayOrder);
        const schema = schemas.find((s) => s.id === schemaId);
        if (schemaAxes.length === 0) return null;
        return (
          <div
            key={schemaId}
            className="space-y-0 divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden"
          >
            {selectedSchemaIds.length > 1 && (
              <div className="px-3 py-2 bg-muted/50 text-sm font-medium text-foreground">
                {schema?.nameKo ?? `템플릿 ${schemaId}`}
              </div>
            )}
            {schemaAxes.map((axis) => (
              <AxisStarRow
                key={axis.id}
                label={axis.nameKo}
                description={axis.descriptionKo ?? undefined}
                value={axisValues[axis.id] ?? RATING_DEFAULT}
                onChange={(value) => onAxisChange(axis.id, value)}
                minValue={axis.minValue}
                maxValue={axis.maxValue}
                displayMultiplier={displayMultiplier}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
