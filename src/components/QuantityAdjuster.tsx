import { useState } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Minus, Plus } from 'lucide-react';

export function QuantityAdjuster({ quantity, onChange }: { quantity: string; onChange: (v: string) => void }) {
  const [adjustAmount, setAdjustAmount] = useState(3);

  const apply = (sign: 1 | -1) => {
    const current = parseFloat(quantity) || 0;
    const next = sign === 1 ? current + adjustAmount : Math.max(0, current - adjustAmount);
    onChange(String(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => apply(-1)}>
          <Minus className="size-4" />
        </Button>
        <div className="flex-1 flex flex-col gap-1">
          <Slider
            min={1}
            max={10}
            step={1}
            value={[adjustAmount]}
            onValueChange={([v]) => setAdjustAmount(v)}
          />
          <span className="text-xs text-center text-muted-foreground">{adjustAmount}g</span>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => apply(1)}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
