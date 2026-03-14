import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useShare } from '../useShare';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigator.share 없을 때 clipboard.writeText 호출 → toast.success', async () => {
    const { toast } = await import('sonner');
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { result } = renderHook(() => useShare());
    await result.current.share('테스트 차', 'https://chalog.app/tea/1');

    expect(writeText).toHaveBeenCalledWith('https://chalog.app/tea/1');
    expect(toast.success).toHaveBeenCalledWith('링크가 복사되었습니다');
  });

  it('clipboard 복사 실패 시 toast.error 호출', async () => {
    const { toast } = await import('sonner');
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn().mockRejectedValue(new Error('clipboard error'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { result } = renderHook(() => useShare());
    await result.current.share('테스트 차', 'https://chalog.app/tea/1');

    expect(toast.error).toHaveBeenCalledWith('링크 복사에 실패했습니다');
  });

  it('navigator.share 있을 때 navigator.share 호출', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });

    const { result } = renderHook(() => useShare());
    await result.current.share('테스트 차', 'https://chalog.app/tea/1');

    expect(shareMock).toHaveBeenCalledWith({
      title: '테스트 차',
      url: 'https://chalog.app/tea/1',
    });
  });

  it('navigator.share AbortError 시 toast 미호출', async () => {
    const { toast } = await import('sonner');
    const abortError = new Error('abort');
    abortError.name = 'AbortError';
    const shareMock = vi.fn().mockRejectedValue(abortError);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });

    const { result } = renderHook(() => useShare());
    await result.current.share('테스트 차', 'https://chalog.app/tea/1');

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('navigator.share 오류(AbortError 제외) 시 clipboard 복사로 fallback', async () => {
    const shareError = new Error('share failed');
    shareError.name = 'NotAllowedError';
    const shareMock = vi.fn().mockRejectedValue(shareError);
    Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const { result } = renderHook(() => useShare());
    await result.current.share('테스트 차', 'https://chalog.app/tea/1');

    expect(writeText).toHaveBeenCalledWith('https://chalog.app/tea/1');
  });
});
