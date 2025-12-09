import React, { useState, useRef, useEffect, useCallback } from 'react';
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

// 상수
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PROFILE_IMAGE_SIZE = 64; // 16 * 4 (w-16 h-16)

interface ProfileImageEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl?: string | null;
  onSuccess: (imageUrl: string) => void;
  userId: number;
}

interface ApiError {
  statusCode?: number;
  message?: string;
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
  const previewUrlRef = useRef<string | null>(null);
  const { isAuthenticated } = useAuth();

  // currentImageUrl이 변경될 때 previewUrl 업데이트
  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
    }
  }, [currentImageUrl]);

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // 에러 처리 헬퍼 함수
  const handleError = useCallback((error: unknown, defaultMessage: string) => {
    const apiError = error as ApiError;
    logger.error(defaultMessage, error);
    
    if (apiError?.statusCode === 401) {
      toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
    } else {
      toast.error(apiError?.message || defaultMessage);
    }
  }, []);

  // 파일 검증
  const validateFile = useCallback((file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return '이미지 파일만 업로드할 수 있습니다.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return '파일 크기는 10MB를 초과할 수 없습니다.';
    }
    
    return null;
  }, []);

  // 파일 입력 초기화
  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    const file = files[0];

    // 파일 검증
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // 이전 미리보기 URL 정리
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    // 미리보기 URL 생성
    const preview = URL.createObjectURL(file);
    previewUrlRef.current = preview;
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
      
      // 성공 시 미리보기 URL 정리
      URL.revokeObjectURL(preview);
      previewUrlRef.current = null;
    } catch (error) {
      // 실패 시 미리보기 URL 정리 및 원래 이미지로 복원
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(currentImageUrl || null);
      
      handleError(error, '프로필 사진 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      resetFileInput();
    }
  }, [isAuthenticated, validateFile, userId, onSuccess, onOpenChange, currentImageUrl, handleError, resetFileInput]);

  const handleRemoveImage = useCallback(async () => {
    if (!currentImageUrl) return;

    setUploading(true);

    try {
      await usersApi.updateProfile(userId, { profileImageUrl: null });
      
      toast.success('프로필 사진이 제거되었습니다.');
      onSuccess('');
      setPreviewUrl(null);
      onOpenChange(false);
    } catch (error) {
      handleError(error, '프로필 사진 제거에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }, [currentImageUrl, userId, onSuccess, onOpenChange, handleError]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.style.display = 'none';
  }, []);

  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4">
        <DialogHeader className="text-center px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-lg font-semibold tracking-tight">프로필 사진</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5 font-normal">
            프로필 사진을 업로드하거나 제거할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* 미리보기 */}
          <div className="flex justify-center py-2">
            {displayImageUrl ? (
              <div 
                className="relative rounded-full overflow-hidden bg-gray-50 ring-1 ring-gray-200/50 shadow-sm"
                style={{ width: PROFILE_IMAGE_SIZE, height: PROFILE_IMAGE_SIZE }}
              >
                <img
                  src={displayImageUrl}
                  alt="프로필 사진 미리보기"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
            ) : (
              <div 
                className="relative rounded-full overflow-hidden bg-gray-50 ring-1 ring-gray-200/50 flex items-center justify-center"
                style={{ width: PROFILE_IMAGE_SIZE, height: PROFILE_IMAGE_SIZE }}
              >
                <Upload className="w-5 h-5 text-gray-400/60" />
              </div>
            )}
          </div>

          {/* 파일 입력 (완전히 숨김) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            aria-hidden="true"
            tabIndex={-1}
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
              opacity: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
          />

          {/* 버튼들 */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleButtonClick}
              disabled={uploading}
              className="w-full h-11 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>업로드 중...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{displayImageUrl ? '사진 변경' : '사진 업로드'}</span>
                </>
              )}
            </Button>

            {currentImageUrl && (
              <Button
                onClick={handleRemoveImage}
                disabled={uploading}
                variant="ghost"
                className="w-full h-11 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all duration-200"
              >
                <X className="w-4 h-4" />
                <span>사진 제거</span>
              </Button>
            )}
          </div>

          {/* 안내 메시지 */}
          <div className="text-[11px] text-muted-foreground/70 text-center space-y-0.5 pt-3">
            <p>이미지 파일만 업로드 가능합니다</p>
            <p>최대 파일 크기: 10MB</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


