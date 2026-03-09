import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAsyncData } from '../useAsyncData';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useAsyncData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('인라인 fetchFn 전달 시 API가 1회만 호출됨 (무한 루프 없음)', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ id: 1, name: 'test' });

    const { result, rerender } = renderHook(() =>
      useAsyncData(() => fetchFn(), {})
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ id: 1, name: 'test' });

    rerender();
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  it('enabled: false일 때 fetch가 호출되지 않음', async () => {
    const fetchFn = vi.fn().mockResolvedValue('data');

    const { result } = renderHook(() =>
      useAsyncData(fetchFn, { enabled: false })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it('refetch() 호출 시 재요청이 정상 동작함', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const { result } = renderHook(() => useAsyncData(fetchFn));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toBe('first');
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('second');
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('에러 발생 시 toast.error 호출됨', async () => {
    const { toast } = await import('sonner');
    const fetchFn = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useAsyncData(fetchFn, { errorMessage: '커스텀 에러 메시지' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(toast.error).toHaveBeenCalledWith('커스텀 에러 메시지');
  });

  it('에러 발생 시 onError 콜백이 호출됨', async () => {
    const onError = vi.fn();
    const fetchFn = vi.fn().mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() =>
      useAsyncData(fetchFn, { onError })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
