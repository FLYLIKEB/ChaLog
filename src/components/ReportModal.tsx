import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { notesApi } from '../lib/api';
import { toast } from 'sonner';

export const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '부적절한 내용' },
  { value: 'copyright', label: '저작권 침해' },
  { value: 'other', label: '기타' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: number;
}

export function ReportModal({ open, onOpenChange, noteId }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setSelectedReason('');
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      await notesApi.report(noteId, selectedReason);
      toast.success('신고가 접수되었습니다.');
      handleClose();
    } catch {
      toast.error('신고 접수에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            노트 신고
          </DialogTitle>
          <DialogDescription>신고 사유를 선택해주세요.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <RadioGroup
            value={selectedReason}
            onValueChange={(value) => setSelectedReason(value as ReportReason)}
          >
            {REPORT_REASONS.map(({ value, label }) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={`reason-${value}`} />
                <Label htmlFor={`reason-${value}`} className="cursor-pointer font-normal">
                  {label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
          >
            {isSubmitting ? '제출 중...' : '신고하기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
