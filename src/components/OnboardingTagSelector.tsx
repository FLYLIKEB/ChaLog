import React from 'react';
import { cn } from './ui/utils';

interface OnboardingTagSelectorProps {
  title: string;
  description?: string;
  tags: readonly string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
  /** 차종 등 태그별 색상 (key: tag, value: Tailwind bg class) */
  tagColors?: Record<string, string>;
}

export function OnboardingTagSelector({
  title,
  description,
  tags,
  selectedTags,
  onToggle,
  tagColors,
}: OnboardingTagSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 -mx-1">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          const colorClass = tagColors?.[tag];
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border hover:bg-muted/60',
              )}
            >
              {!isSelected && colorClass && (
                <span className={cn('w-1.5 h-5 rounded-full shrink-0', colorClass)} aria-hidden />
              )}
              {tag}
            </button>
          );
        })}
      </div>
    </section>
  );
}
