import React, { useState, useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
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
import { logger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';

interface ProfileImageEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl?: string | null;
  onSuccess: (imageUrl: string) => void;
  userId: number;
}

export function ProfileImageEditModal({
  open,
  onOpenChange,
  currentImageUrl,
  onSuccess,
  userId,
}: ProfileImageEditModalProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const file = files[0];

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 검증 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    // 미리보기 URL 생성
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    setUploading(true);

    try {
      // 프로필 이미지 업로드
      const result = await usersApi.uploadProfileImage(file);
      
      // 프로필 업데이트
      await usersApi.updateProfile(userId, { profileImageUrl: result.url });
      
      toast.success('프로필 사진이 업데이트되었습니다.');
      onSuccess(result.url);
      onOpenChange(false);
      
      // 미리보기 URL 정리
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    } catch (error: any) {
      logger.error('Failed to upload profile image:', error);
      
      // 미리보기 URL 정리
      if (preview) {
        URL.revokeObjectURL(preview);
      }
      setPreviewUrl(currentImageUrl || null);
      
      if (error?.statusCode === 401) {
        toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
      } else {
        toast.error(error?.message || '프로필 사진 업로드에 실패했습니다.');
      }
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    setUploading(true);

    try {
      // 프로필 이미지 제거
      await usersApi.updateProfile(userId, { profileImageUrl: null });
      
      toast.success('프로필 사진이 제거되었습니다.');
      onSuccess('');
      setPreviewUrl(null);
      onOpenChange(false);
    } catch (error: any) {
      logger.error('Failed to remove profile image:', error);
      if (error?.statusCode === 401) {
        toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
      } else {
        toast.error(error?.message || '프로필 사진 제거에 실패했습니다.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로필 사진 수정</DialogTitle>
          <DialogDescription>
            프로필 사진을 업로드하거나 제거할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 미리보기 */}
          {previewUrl && (
            <div className="flex justify-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
                <img
                  src={previewUrl}
                  alt="프로필 사진 미리보기"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* 파일 입력 (숨김) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {/* 버튼들 */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleButtonClick}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {previewUrl ? '사진 변경' : '사진 업로드'}
                </>
              )}
            </Button>

            {currentImageUrl && (
              <Button
                onClick={handleRemoveImage}
                disabled={uploading}
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
              >
                <X className="w-4 h-4" />
                사진 제거
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


