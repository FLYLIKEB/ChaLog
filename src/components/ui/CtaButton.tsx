import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

interface CtaButtonProps {
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  variant?: 'muted' | 'primary';
  className?: string;
}

export function CtaButton({ onClick, icon: Icon, label, variant = 'muted', className }: CtaButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-semibold'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
