import { AlertCircle } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { TeaTypeSelector } from '../TeaTypeSelector';

interface TeaBasicInfoFormProps {
  name: string;
  onNameChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  typeTouched: boolean;
  isLoading: boolean;
  isCheckingDuplicate: boolean;
  duplicateWarning: string | null;
  duplicateTeaId: number | null;
  onUseExisting: () => void;
}

export function TeaBasicInfoForm({
  name,
  onNameChange,
  type,
  onTypeChange,
  typeTouched,
  isLoading,
  isCheckingDuplicate,
  duplicateWarning,
  duplicateTeaId,
  onUseExisting,
}: TeaBasicInfoFormProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          차 이름 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          placeholder="예: 정산소종, 다즐링, 동정미록"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={isLoading}
          required
        />
        {isCheckingDuplicate && (
          <p className="text-xs text-muted-foreground">중복 확인 중...</p>
        )}
        {duplicateWarning && (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 dark:text-amber-200">{duplicateWarning}</p>
                {duplicateTeaId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={onUseExisting}
                  >
                    기존 차 사용하기
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">
          차 종류 <span className="text-red-500">*</span>
        </div>
        <TeaTypeSelector
          value={type}
          onChange={onTypeChange}
          disabled={isLoading}
          error={typeTouched && !type}
        />
        {!type && typeTouched && (
          <p className="text-xs text-destructive">차 종류를 선택해주세요.</p>
        )}
        {!type && !typeTouched && (
          <p className="text-xs text-muted-foreground">1개 선택</p>
        )}
      </div>
    </>
  );
}
