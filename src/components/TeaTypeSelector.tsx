import { TEA_TYPES, TEA_TYPE_COLORS } from '../constants';
import { cn } from './ui/utils';

export interface TeaTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onTouch?: () => void;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  'aria-label'?: string;
}

export function TeaTypeSelector({
  value,
  onChange,
  onTouch,
  disabled = false,
  error = false,
  id,
  'aria-label': ariaLabel = '차 종류 선택',
}: TeaTypeSelectorProps) {
  return (
    <div
      id={id}
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {TEA_TYPES.map((teaType) => {
        const isSelected = value === teaType;
        return (
          <button
            key={teaType}
            type="button"
            onClick={() => {
              onChange(teaType);
              onTouch?.();
            }}
            disabled={disabled}
            aria-pressed={isSelected}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
              'border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              isSelected
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-background text-foreground hover:border-muted-foreground/40 hover:bg-muted/60',
              error && !value && 'border-destructive/50'
            )}
          >
            <span
              className={cn(
                'size-2.5 shrink-0 rounded-full',
                isSelected ? 'bg-primary-foreground/80' : TEA_TYPE_COLORS[teaType]
              )}
              aria-hidden
            />
            {teaType}
          </button>
        );
      })}
    </div>
  );
}
