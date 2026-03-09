import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { postsApi } from '../lib/api';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { PostImageItem } from '../types';

interface PostImageUploaderProps {
  images: PostImageItem[];
  onChange: (images: PostImageItem[]) => void;
  maxImages?: number;
}

export function PostImageUploader({
  images,
  onChange,
  maxImages = 5,
}: PostImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`최대 ${maxImages}장까지 업로드할 수 있습니다.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = filesToUpload.filter(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type),
    );
    if (invalidFiles.length > 0) {
      toast.error('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.');
      return;
    }

    const oversizedFiles = filesToUpload.filter(
      (file) => file.size > 10 * 1024 * 1024,
    );
    if (oversizedFiles.length > 0) {
      toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = filesToUpload.map((file) =>
        postsApi.uploadImage(file),
      );
      const results = await Promise.allSettled(uploadPromises);

      const successfulItems: PostImageItem[] = [];
      let failedCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successfulItems.push({
            url: result.value.url,
            thumbnailUrl: result.value.thumbnailUrl ?? undefined,
            caption: undefined,
          });
        } else {
          failedCount++;
          logger.error('Failed to upload image:', result.reason);
        }
      }

      if (successfulItems.length > 0) {
        const newImages = [...images, ...successfulItems];
        onChange(newImages);
        toast.success(`${successfulItems.length}장의 이미지가 업로드되었습니다.`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount}장의 이미지 업로드에 실패했습니다.`);
      }

      if (successfulItems.length === 0 && failedCount > 0) {
        const firstError = results.find(
          (r) => r.status === 'rejected',
        ) as PromiseRejectedResult;
        const reason = firstError?.reason;
        const isAuthError =
          reason?.statusCode === 401 ||
          (reason?.statusCode === 500 &&
            typeof reason?.message === 'string' &&
            /session|expired|reauthenticate/i.test(reason.message));
        if (isAuthError) {
          logout();
          toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
          navigate('/login');
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const newImages = images.map((img, i) =>
      i === index ? { ...img, caption: caption.trim() || undefined } : img,
    );
    onChange(newImages);
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">사진</label>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((item, index) => (
            <div key={`image-${index}-${item.url}`} className="space-y-2">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={`업로드된 이미지 ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <textarea
                value={item.caption ?? ''}
                onChange={(e) => handleCaptionChange(index, e.target.value)}
                placeholder="이미지 설명 (선택)"
                maxLength={300}
                rows={2}
                className="w-full text-xs border border-border rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleRemove(index);
                }}
                className="w-full py-2 bg-destructive hover:bg-destructive/90 active:bg-destructive/80 rounded-lg text-destructive-foreground text-sm font-semibold shadow-md transition-all duration-200 flex items-center justify-center gap-1.5"
                aria-label={`이미지 ${index + 1} 삭제`}
                title="삭제"
              >
                <X className="w-4 h-4" strokeWidth={3} />
                <span>삭제</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
              display: 'none',
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                업로드 중...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                사진 추가 ({images.length}/{maxImages})
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-0.5 text-center">
            갤러리에서 선택하거나 카메라로 촬영할 수 있습니다
          </p>
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg py-4 px-5 text-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-sm text-muted-foreground mb-1">사진을 추가해보세요</p>
          <p className="text-xs text-muted-foreground">
            최대 {maxImages}장까지 업로드 가능
          </p>
        </div>
      )}
    </div>
  );
}
