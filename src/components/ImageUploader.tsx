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
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUploader({ images, onChange, maxImages = 5 }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
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
      let failedCount = 0;
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successfulUrls.push(result.value.url);
        } else {
          failedCount++;
          logger.error('Failed to upload image:', result.reason);
        }
      }
      
      if (successfulUrls.length > 0) {
        onChange([...images, ...successfulUrls]);
        toast.success(`${successfulUrls.length}장의 이미지가 업로드되었습니다.`);
      }
      
      if (failedCount > 0) {
        toast.error(`${failedCount}장의 이미지 업로드에 실패했습니다.`);
      }
      
      // 모든 업로드가 실패한 경우에만 에러 처리
      if (successfulUrls.length === 0 && failedCount > 0) {
        const firstError = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        if (firstError?.reason?.statusCode === 401) {
          toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
          navigate('/login');
        }
      }
    } catch (error: any) {
      logger.error('Failed to upload images:', error);
      if (error?.statusCode === 401) {
        toast.error('로그인이 필요합니다. 다시 로그인해주세요.');
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">사진</label>
        <span className="text-xs text-gray-500">
          {images.length}/{maxImages}
        </span>
      </div>

      {/* 이미지 미리보기 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, index) => (
            <div key={`image-${index}-${url}`} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img
                src={url}
                alt={`업로드된 이미지 ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* 삭제 버튼 - 애플 스타일 */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange(images.filter((_, i) => i !== index));
                }}
                className="absolute top-2 right-2 w-9 h-9 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-black/90 hover:scale-110 active:scale-95"
                style={{ 
                  zIndex: 10,
                }}
                aria-label={`이미지 ${index + 1} 삭제`}
                title="삭제"
              >
                <X className="w-4 h-4 text-white" strokeWidth={2.5} />
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
            className="hidden"
            disabled={uploading}
            aria-hidden="true"
            tabIndex={-1}
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
          <p className="text-xs text-gray-500 mt-1 text-center">
            갤러리에서 선택하거나 카메라로 촬영할 수 있습니다
          </p>
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">사진을 추가해보세요</p>
          <p className="text-xs text-gray-400">최대 {maxImages}장까지 업로드 가능</p>
        </div>
      )}
    </div>
  );
}

