import { useState, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';
import { toast } from 'sonner';

interface UseAsyncDataOptions<T> {
  onError?: (error: Error) => void;
  errorMessage?: string;
  enabled?: boolean;
}

interface UseAsyncDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * 비동기 데이터 로딩을 위한 커스텀 훅
 * 로딩 상태, 에러 처리, 재요청 기능을 제공합니다.
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const { onError, errorMessage = '데이터를 불러오는데 실패했습니다.', enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.');
      logger.error('Failed to fetch data:', error);
      setError(error);
      
      if (onError) {
        onError(error);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, enabled, onError, errorMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

