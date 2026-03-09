import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { usersApi } from '../lib/api';
import { toast } from 'sonner';
import { UserOnboardingPreference } from '../types';
import { OnboardingTagSelector } from './OnboardingTagSelector';
import { ONBOARDING_TEA_TYPES, ONBOARDING_FLAVOR_TAGS, TEA_TYPE_COLORS } from '../constants';

interface OnboardingPreferenceEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  preference: UserOnboardingPreference | null;
  onSuccess: (updated: UserOnboardingPreference) => void;
}

export function OnboardingPreferenceEditModal({
  open,
  onOpenChange,
  userId,
  preference,
  onSuccess,
}: OnboardingPreferenceEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [selectedTeaTypes, setSelectedTeaTypes] = useState<string[]>([]);
  const [selectedFlavorTags, setSelectedFlavorTags] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setSelectedTeaTypes(preference?.preferredTeaTypes ?? []);
      setSelectedFlavorTags(preference?.preferredFlavorTags ?? []);
    }
  }, [open, preference]);

  const toggleTeaType = (tag: string) => {
    setSelectedTeaTypes((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleFlavorTag = (tag: string) => {
    setSelectedFlavorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTeaTypes.length === 0) {
      toast.error('관심 차종을 최소 1개 선택해주세요.');
      return;
    }
    if (selectedFlavorTags.length === 0) {
      toast.error('향미를 최소 1개 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const updated = await usersApi.updateOnboardingPreference(userId, {
        preferredTeaTypes: selectedTeaTypes,
        preferredFlavorTags: selectedFlavorTags,
      });
      toast.success('취향이 저장되었습니다.');
      onSuccess(updated);
      onOpenChange(false);
    } catch {
      toast.error('취향 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[90vh] overflow-y-auto p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="text-center px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-lg font-semibold tracking-tight">취향 수정</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 font-normal">
            관심 차종과 향미를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
          <OnboardingTagSelector
            title="관심 차종"
            description="자주 마시는 차 종류를 선택해주세요."
            tags={ONBOARDING_TEA_TYPES}
            selectedTags={selectedTeaTypes}
            onToggle={toggleTeaType}
            tagColors={TEA_TYPE_COLORS}
          />
          <OnboardingTagSelector
            title="향미"
            description="좋아하는 향미를 선택해주세요."
            tags={ONBOARDING_FLAVOR_TAGS}
            selectedTags={selectedFlavorTags}
            onToggle={toggleFlavorTag}
          />

          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl text-sm font-medium active:scale-[0.98] transition-all duration-200 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>저장 중...</span>
                </>
              ) : (
                <span>저장</span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="w-full h-11 rounded-xl text-sm font-medium"
            >
              취소
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
