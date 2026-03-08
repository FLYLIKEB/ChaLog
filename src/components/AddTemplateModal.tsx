import React, { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { notesApi, CreateRatingSchemaRequest } from '../lib/api';
import { RatingSchema } from '../types';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

interface AddTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (schema: RatingSchema) => void;
}

const DEFAULT_AXES = [
  { nameKo: '향', nameEn: 'Aroma' },
  { nameKo: '맛', nameEn: 'Taste' },
  { nameKo: '여운', nameEn: 'Finish' },
];

export function AddTemplateModal({
  open,
  onOpenChange,
  onSuccess,
}: AddTemplateModalProps) {
  const [nameKo, setNameKo] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [axes, setAxes] = useState<Array<{ nameKo: string; nameEn: string }>>([
    ...DEFAULT_AXES,
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addAxis = () => {
    setAxes(prev => [...prev, { nameKo: '', nameEn: '' }]);
  };

  const removeAxis = (index: number) => {
    if (axes.length <= 1) return;
    setAxes(prev => prev.filter((_, i) => i !== index));
  };

  const updateAxis = (index: number, field: 'nameKo' | 'nameEn', value: string) => {
    setAxes(prev =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const handleSubmit = async () => {
    if (!nameKo.trim()) {
      toast.error('템플릿 이름을 입력해주세요.');
      return;
    }
    const validAxes = axes.filter(a => a.nameKo.trim());
    if (validAxes.length === 0) {
      toast.error('최소 1개 이상의 평가 항목을 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const data: CreateRatingSchemaRequest = {
        nameKo: nameKo.trim(),
        descriptionKo: descriptionKo.trim() || undefined,
        axes: validAxes.map((a, i) => ({
          nameKo: a.nameKo.trim(),
          nameEn: a.nameEn.trim() || a.nameKo.trim(),
          displayOrder: i,
        })),
      };
      const schema = await notesApi.createSchema(data);
      toast.success('템플릿이 추가되었습니다.');
      onSuccess(schema);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      logger.error('Failed to create schema:', error);
      toast.error(error instanceof Error ? error.message : '템플릿 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNameKo('');
    setDescriptionKo('');
    setAxes([...DEFAULT_AXES]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 템플릿 추가</DialogTitle>
          <DialogDescription>
            평가 항목을 직접 설정한 테이스팅 템플릿을 만들 수 있어요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="template-name">템플릿 이름 *</Label>
            <Input
              id="template-name"
              placeholder="예: 내 맛 평가"
              value={nameKo}
              onChange={e => setNameKo(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="template-desc">설명 (선택)</Label>
            <Input
              id="template-desc"
              placeholder="예: 내가 중요하게 보는 항목들"
              value={descriptionKo}
              onChange={e => setDescriptionKo(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>평가 항목 *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addAxis}
                className="h-8 px-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                추가
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {axes.map((axis, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center p-2 rounded-lg bg-muted/50"
                >
                  <Input
                    placeholder="항목명 (한글)"
                    value={axis.nameKo}
                    onChange={e => updateAxis(index, 'nameKo', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="영문"
                    value={axis.nameEn}
                    onChange={e => updateAxis(index, 'nameEn', e.target.value)}
                    className="flex-1 max-w-[100px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAxis(index)}
                    disabled={axes.length <= 1}
                    className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                추가 중...
              </>
            ) : (
              '추가'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
