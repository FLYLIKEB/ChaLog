import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { getOriginsForTeaType } from '../../constants';

interface TeaOriginSectionProps {
  type: string;
  origin: string;
  onOriginChange: (value: string) => void;
  isLoading: boolean;
}

export function TeaOriginSection({ type, origin, onOriginChange, isLoading }: TeaOriginSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="origin" className="text-xs">산지 <span className="text-muted-foreground font-normal">(선택)</span></Label>
      <div className="flex flex-wrap gap-2">
        {getOriginsForTeaType(type).map((o) => (
          <Button
            key={o}
            type="button"
            variant={origin === o ? 'default' : 'outline'}
            size="sm"
            onClick={() => onOriginChange(origin === o ? '' : o)}
            disabled={isLoading}
            className="h-6 px-2 text-xs"
          >
            {o}
          </Button>
        ))}
      </div>
      <Input
        id="origin"
        type="text"
        placeholder="직접 입력 (예: 윈난, 다즐링)"
        value={origin}
        onChange={(e) => onOriginChange(e.target.value)}
        disabled={isLoading}
        className="mt-1"
      />
    </div>
  );
}
