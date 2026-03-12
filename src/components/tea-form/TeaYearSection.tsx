import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { CURRENT_YEAR, YEAR_OPTIONS } from '../../constants';

interface TeaYearSectionProps {
  yearSelect: string;
  onYearSelectChange: (value: string) => void;
  yearCustom: string;
  onYearCustomChange: (value: string) => void;
  isLoading: boolean;
}

export function TeaYearSection({
  yearSelect,
  onYearSelectChange,
  yearCustom,
  onYearCustomChange,
  isLoading,
}: TeaYearSectionProps) {
  return (
    <div className="space-y-2" role="group" aria-labelledby="year-label">
      <Label id="year-label" htmlFor="year-select">제조 연도 <span className="text-muted-foreground font-normal">(선택)</span></Label>
      <div className="flex flex-wrap gap-2 mb-1">
        <Button
          type="button"
          variant={yearSelect === String(CURRENT_YEAR) ? 'default' : 'outline'}
          size="sm"
          onClick={() => onYearSelectChange(String(CURRENT_YEAR))}
          disabled={isLoading}
          className="h-6 px-2 text-xs"
        >
          올해
        </Button>
        <Button
          type="button"
          variant={yearSelect === String(CURRENT_YEAR - 1) ? 'default' : 'outline'}
          size="sm"
          onClick={() => onYearSelectChange(String(CURRENT_YEAR - 1))}
          disabled={isLoading}
          className="h-6 px-2 text-xs"
        >
          작년
        </Button>
        <Button
          type="button"
          variant={yearSelect === '__none__' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onYearSelectChange('__none__')}
          disabled={isLoading}
          className="h-6 px-2 text-xs"
        >
          선택 안 함
        </Button>
      </div>
      <Select value={yearSelect} onValueChange={onYearSelectChange} disabled={isLoading}>
        <SelectTrigger id="year-select" className="w-full" aria-label="연도 선택">
          <SelectValue placeholder="연도를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">선택 안 함</SelectItem>
          {YEAR_OPTIONS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}년
            </SelectItem>
          ))}
          <SelectItem value="custom">그 외 (직접 입력)</SelectItem>
        </SelectContent>
      </Select>
      {yearSelect === 'custom' && (
        <Input
          id="year-custom"
          type="number"
          placeholder="1900~1989년"
          value={yearCustom}
          onChange={(e) => onYearCustomChange(e.target.value)}
          disabled={isLoading}
          min={1900}
          max={1989}
          className="mt-2"
          aria-label="연도 직접 입력"
        />
      )}
    </div>
  );
}
