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
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onSuccess: (updatedUser: Partial<User>) => void;
}

export function ProfileEditModal({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ProfileEditModalProps) {
  const { updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(user.name ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [instagramUrl, setInstagramUrl] = useState(user.instagramUrl ?? '');
  const [blogUrl, setBlogUrl] = useState(user.blogUrl ?? '');

  useEffect(() => {
    if (open) {
      setName(user.name ?? '');
      setBio(user.bio ?? '');
      setInstagramUrl(user.instagramUrl ?? '');
      setBlogUrl(user.blogUrl ?? '');
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateProfile(user.id, {
        name: name.trim(),
        bio: bio.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        blogUrl: blogUrl.trim() || null,
      });

      const updatedFields = {
        name: name.trim(),
        bio: bio.trim() || null,
        instagramUrl: instagramUrl.trim() || null,
        blogUrl: blogUrl.trim() || null,
      };
      toast.success('프로필이 업데이트되었습니다.');
      updateUser(updatedFields);
      onSuccess(updatedFields);
      onOpenChange(false);
    } catch {
      toast.error('프로필 업데이트에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="text-center px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-lg font-semibold tracking-tight">프로필 편집</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 font-normal">
            이름, 자기소개, 소셜 링크를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
              이름 <span className="text-destructive">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="이름을 입력하세요"
              disabled={saving}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-bio" className="text-sm font-medium text-foreground">
              한 줄 자기소개
            </label>
            <div className="relative">
              <input
                id="profile-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                placeholder="차에 대한 짧은 소개를 남겨보세요"
                disabled={saving}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-colors pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {bio.length}/150
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-instagram" className="text-sm font-medium text-foreground">
              인스타그램
            </label>
            <input
              id="profile-instagram"
              type="url"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              maxLength={500}
              placeholder="https://instagram.com/yourname"
              disabled={saving}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-blog" className="text-sm font-medium text-foreground">
              블로그 / 웹사이트
            </label>
            <input
              id="profile-blog"
              type="url"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
              maxLength={500}
              placeholder="https://myblog.com"
              disabled={saving}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-colors"
            />
          </div>

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
