import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { COMMON_PRICES, COMMON_WEIGHTS, formatPriceToKorean } from '../../constants';

interface TeaPriceWeightSectionProps {
  price: string;
  onPriceChange: (value: string) => void;
  weight: string;
  onWeightChange: (value: string) => void;
  isLoading: boolean;
}

export function TeaPriceWeightSection({
  price,
  onPriceChange,
  weight,
  onWeightChange,
  isLoading,
}: TeaPriceWeightSectionProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="price">가격 <span className="text-muted-foreground font-normal">(선택)</span></Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_PRICES.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const current = parseInt(price.replace(/,/g, ''), 10) || 0;
                onPriceChange(String(current + p));
              }}
              disabled={isLoading}
              className="h-6 px-2 text-xs"
            >
              +{formatPriceToKorean(p)}원
            </Button>
          ))}
        </div>
        <Input
          id="price"
          type="text"
          inputMode="numeric"
          placeholder="직접 입력 (예: 15000)"
          value={price}
          onChange={(e) => onPriceChange(e.target.value.replace(/[^0-9,]/g, ''))}
          disabled={isLoading}
          aria-label="가격 (원)"
          className="mt-1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="weight">무게 <span className="text-muted-foreground font-normal">(선택)</span></Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_WEIGHTS.map((w) => (
            <Button
              key={w}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const current = parseInt(weight.replace(/,/g, ''), 10) || 0;
                onWeightChange(String(current + w));
              }}
              disabled={isLoading}
              className="h-6 px-2 text-xs"
            >
              +{w}g
            </Button>
          ))}
        </div>
        <Input
          id="weight"
          type="text"
          inputMode="numeric"
          placeholder="직접 입력 (예: 50)"
          value={weight}
          onChange={(e) => onWeightChange(e.target.value.replace(/[^0-9,]/g, ''))}
          disabled={isLoading}
          aria-label="무게 (g)"
          className="mt-1"
        />
      </div>
    </>
  );
}
