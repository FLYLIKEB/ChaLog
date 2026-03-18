import React, { useRef } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { notesApi } from '../lib/api';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useImageUpload } from '../hooks/useImageUpload';

interface ImageUploaderProps {
  images: string[];
  imageThumbnails?: (string | null)[];
  onChange: (images: string[], imageThumbnails: (string | null)[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, imageThumbnails = [], onChange, maxImages = 5 }: ImageUploaderProps) {
  const { status, setStatus, validate } = useImageUpload({ maxSizeMB: 10 });
  const uploading = status === 'uploading';
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

    for (const file of filesToUpload) {
      const validationError = validate(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }
    }

    setStatus('uploading');

    try {
      const uploadPromises = filesToUpload.map(file => notesApi.uploadImage(file));
      const results = await Promise.allSettled(uploadPromises);

      const successfulUrls: string[] = [];
      const successfulThumbnailUrls: (string | null)[] = [];
      let failedCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successfulUrls.push(result.value.url);
          successfulThumbnailUrls.push(result.value.thumbnailUrl ?? null);
        } else {
          failedCount++;
          logger.error('Failed to upload image:', result.reason);
        }
      }

      if (successfulUrls.length > 0) {
        const newImages = [...images, ...successfulUrls];
        const newThumbnails = [...(imageThumbnails.length === images.length ? imageThumbnails : images.map(() => null)), ...successfulThumbnailUrls];
        onChange(newImages, newThumbnails);
        toast.success(`${successfulUrls.length}장의 이미지가 업로드되었습니다.`);
      }

      if (failedCount > 0) {
        toast.error(`${failedCount}장의 이미지 업로드에 실패했습니다.`);
      }

      if (successfulUrls.length === 0 && failedCount > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        const reason = firstError?.reason;
        const isAuthError = reason?.statusCode === 401 ||
          (reason?.statusCode === 500 && typeof reason?.message === 'string' && /session|expired|reauthenticate/i.test(reason.message));
        if (isAuthError) {
          logout();
          toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
          navigate('/login');
        }
      }
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string };
      logger.error('Failed to upload images:', error);
      if (err?.statusCode === 401 || (err?.statusCode === 500 && typeof err?.message === 'string' && /session|expired|reauthenticate/i.test(err.message))) {
        logout();
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login');
      } else {
        toast.error(err?.message || '이미지 업로드에 실패했습니다.');
      }
    } finally {
      setStatus('idle');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newThumbnails = (imageThumbnails.length === images.length ? imageThumbnails : images.map(() => null))
      .filter((_, i) => i !== index);
    onChange(newImages, newThumbnails);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">사진</label>
        <span className="text-xs text-muted-foreground">{images.length}/{maxImages}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {images.map((url, index) => (
          <div key={`image-${index}-${url}`} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
            <img
              src={url}
              alt={`이미지 ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
              aria-label={`이미지 ${index + 1} 삭제`}
            >
              <X className="w-3 h-3 text-white" strokeWidth={2.5} />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
              aria-hidden="true"
              tabIndex={-1}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 hover:bg-muted/50 hover:border-muted-foreground/40 transition-colors disabled:opacity-50"
              aria-label="사진 추가"
            >
              {uploading ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <>
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">추가</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
