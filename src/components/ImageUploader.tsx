import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { notesApi } from '../lib/api';
import { toast } from 'sonner';
import { logger } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ImageUploaderProps {
  images: string[];
  imageThumbnails?: (string | null)[];
  onChange: (images: string[], imageThumbnails: (string | null)[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, imageThumbnails = [], onChange, maxImages = 5 }: ImageUploaderProps) {
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

    // 파일 타입 검증
    const invalidFiles = filesToUpload.filter(
      file => !file.type.startsWith('image/')
    );
    if (invalidFiles.length > 0) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    // 파일 크기 검증 (10MB)
    const oversizedFiles = filesToUpload.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setUploading(true);

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
      
      // 모든 업로드가 실패한 경우에만 에러 처리
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
    } catch (error: any) {
      logger.error('Failed to upload images:', error);
      if (error?.statusCode === 401) {
        logout();
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login');
      } else if (error?.statusCode === 500 && typeof error?.message === 'string' && /session|expired|reauthenticate/i.test(error.message)) {
        // 500이지만 세션 만료 메시지인 경우 (구버전 백엔드 호환)
        logout();
        toast.error('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        navigate('/login');
      } else {
        toast.error(error?.message || '이미지 업로드에 실패했습니다.');
      }
    } finally {
      setUploading(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">사진</label>
        <span className="text-xs text-gray-500">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* 이미지 미리보기 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((url, index) => (
            <div key={`image-${index}-${url}`} className="space-y-2">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={url}
                  alt={`업로드된 이미지 ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              {/* 삭제 버튼 - 이미지 밑에 빨간색으로 배치 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const newImages = images.filter((_, i) => i !== index);
                  const newThumbnails = (imageThumbnails.length === images.length ? imageThumbnails : images.map(() => null))
                    .filter((_, i) => i !== index);
                  onChange(newImages, newThumbnails);
                }}
                className="w-full py-2 bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-lg text-white text-sm font-semibold shadow-md transition-all duration-200 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: '#ef4444',
                }}
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

      {/* 업로드 버튼 */}
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
          <p className="text-xs text-gray-500 mt-0.5 text-center">
            갤러리에서 선택하거나 카메라로 촬영할 수 있습니다
          </p>
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg py-4 px-5 text-center">
          <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1.5" />
          <p className="text-sm text-gray-500 mb-1">사진을 추가해보세요</p>
          <p className="text-xs text-gray-400">최대 {maxImages}장까지 업로드 가능</p>
        </div>
      )}
    </div>
  );
}

