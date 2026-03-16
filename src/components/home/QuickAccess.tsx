import { useNavigate } from 'react-router-dom';
import { FileText, Search, Package } from 'lucide-react';
import { cn } from '@/components/ui/utils';

const ITEMS = [
  { label: '내 차록', path: '/my-notes', icon: FileText, color: 'text-primary bg-primary/10' },
  { label: '탐색', path: '/sasaek', icon: Search, color: 'text-blue-500 bg-blue-500/10' },
  { label: '내 찻장', path: '/cellar', icon: Package, color: 'text-amber-500 bg-amber-500/10' },
] as const;

export function QuickAccess() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-2 md:gap-3">
      {ITEMS.map(({ label, path, icon: Icon, color }) => (
        <button
          key={path}
          onClick={() => navigate(path)}
          className="flex-1 flex items-center gap-2 px-3 py-2.5 md:px-4 md:py-3 rounded-xl bg-card border border-border/30 hover:bg-muted/30 transition-colors active:scale-[0.98]"
        >
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', color)}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs md:text-sm font-semibold text-foreground">{label}</span>
        </button>
      ))}
    </div>
  );
}
