import { useNavigate } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { SellerCombobox } from '../SellerCombobox';

interface TeaSellerSectionProps {
  seller: string;
  onSellerChange: (value: string) => void;
  isLoading: boolean;
}

export function TeaSellerSection({ seller, onSellerChange, isLoading }: TeaSellerSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-2">
      <Label htmlFor="seller">구매처 <span className="text-muted-foreground font-normal">(선택)</span></Label>
      <div className="flex gap-2">
        <SellerCombobox
          id="seller"
          value={seller}
          onChange={onSellerChange}
          disabled={isLoading}
          placeholder="검색하거나 새 찻집 이름 입력"
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isLoading}
          onClick={() => navigate('/teahouse/new?returnTo=/tea/new')}
          aria-label="찻집 추가"
          title="찻집 추가"
        >
          <Store className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        기존 찻집을 선택하거나, 새 찻집 추가 버튼으로 등록할 수 있어요.
      </p>
    </div>
  );
}
