import { useState, useCallback } from 'react';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export function useImageUpload(options?: {
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
}) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);

  const validate = useCallback((file: File): string | null => {
    const maxSize = (options?.maxSizeMB ?? 10) * 1024 * 1024;
    const allowedTypes = options?.allowedTypes ?? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) return '지원하지 않는 파일 형식입니다.';
    if (file.size > maxSize) return `파일 크기는 ${options?.maxSizeMB ?? 10}MB 이하여야 합니다.`;
    return null;
  }, [options]);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setError(null);
    setUrls([]);
  }, []);

  return { status, progress, error, urls, setUrls, validate, setStatus, setProgress, setError, reset };
}
