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
import { postsApi, REPORT_REASONS, ReportReason } from '../lib/api';
import { toast } from 'sonner';

interface PostReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: number;
}

export function PostReportModal({ open, onOpenChange, postId }: PostReportModalProps) {
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
      await postsApi.report(postId, selectedReason);
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
            게시글 신고
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
                <RadioGroupItem value={value} id={`post-reason-${value}`} />
                <Label htmlFor={`post-reason-${value}`} className="cursor-pointer font-normal">
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
