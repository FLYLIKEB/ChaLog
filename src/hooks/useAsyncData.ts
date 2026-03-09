import { useState, useEffect, useCallback, useRef, type DependencyList } from 'react';
import { logger } from '../lib/logger';
import { toast } from 'sonner';

interface UseAsyncDataOptions<T> {
  onError?: (error: Error) => void;
  errorMessage?: string;
  enabled?: boolean;
  /** fetchFn의 캡처 값(postId 등)이 바뀔 때 재조회를 트리거할 의존성 배열 */
  deps?: DependencyList;
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
 *
 * @param fetchFn - 데이터를 가져오는 비동기 함수 (인라인 전달 가능, useRef로 안정화)
 * @param options.deps - fetchFn이 캡처하는 값(postId 등)이 바뀔 때 재조회를 트리거할 의존성 배열.
 *   예: useAsyncData(() => api.getPost(postId), { deps: [postId] })
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const {
    onError,
    errorMessage = '데이터를 불러오는데 실패했습니다.',
    enabled = true,
    deps = [],
  } = options;

  const fetchFnRef = useRef(fetchFn);
  const onErrorRef = useRef(onError);
  fetchFnRef.current = fetchFn;
  onErrorRef.current = onError;

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
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다.');
      logger.error('Failed to fetch data:', error);
      setError(error);

      const onErrorFn = onErrorRef.current;
      if (onErrorFn) {
        onErrorFn(error);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, errorMessage, ...deps]);

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

