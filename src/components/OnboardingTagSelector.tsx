import React from 'react';
import { cn } from './ui/utils';

interface OnboardingTagSelectorProps {
  title: string;
  description?: string;
  tags: readonly string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
}

export function OnboardingTagSelector({
  title,
  description,
  tags,
  selectedTags,
  onToggle,
}: OnboardingTagSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 -mx-1">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:text-emerald-600',
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </section>
  );
}
