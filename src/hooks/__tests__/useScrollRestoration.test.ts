import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRef } from 'react';
import { useScrollRestoration } from '../useScrollRestoration';

const mockPathname = { current: '/' };

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: mockPathname.current }),
}));

describe('useScrollRestoration', () => {
  let originalScrollTo: typeof window.scrollTo;
  let scrollYValue = 0;

  beforeEach(() => {
    sessionStorage.clear();
    originalScrollTo = window.scrollTo;
    window.scrollTo = vi.fn();
    scrollYValue = 0;
    Object.defineProperty(window, 'scrollY', {
      get: () => scrollYValue,
      configurable: true,
    });
    mockPathname.current = '/';
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    window.scrollTo = originalScrollTo;
    vi.unstubAllGlobals();
  });

  it('저장된 스크롤 위치가 없으면 window.scrollTo를 호출하지 않는다', () => {
    renderHook(() => useScrollRestoration());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('sessionStorage에 저장된 스크롤 위치를 복원한다', () => {
    sessionStorage.setItem('scroll_pos_/', '350');
    renderHook(() => useScrollRestoration());
    expect(window.scrollTo).toHaveBeenCalledWith(0, 350);
  });

  it('언마운트 시 현재 scrollY를 sessionStorage에 저장한다', () => {
    scrollYValue = 200;
    const { unmount } = renderHook(() => useScrollRestoration());
    unmount();
    expect(sessionStorage.getItem('scroll_pos_/')).toBe('200');
  });

  it('pathname 변경 후 언마운트 시 새 경로의 스크롤 위치를 저장한다', () => {
    scrollYValue = 500;
    mockPathname.current = '/search';

    const { unmount } = renderHook(() => useScrollRestoration());
    unmount();

    expect(sessionStorage.getItem('scroll_pos_/search')).toBe('500');
  });

  it('scrollContainerRef가 있으면 scrollTop을 기준으로 복원한다', () => {
    const ref = createRef<HTMLDivElement>();
    const div = document.createElement('div');
    Object.defineProperty(div, 'scrollTop', { value: 0, writable: true, configurable: true });
    (ref as React.MutableRefObject<HTMLDivElement>).current = div;

    sessionStorage.setItem('scroll_pos_/', '120');

    renderHook(() => useScrollRestoration(ref));

    expect(div.scrollTop).toBe(120);
  });

  it('scrollContainerRef가 있을 때 언마운트 시 scrollTop을 저장한다', () => {
    const ref = createRef<HTMLDivElement>();
    const div = document.createElement('div');
    Object.defineProperty(div, 'scrollTop', { value: 300, writable: true, configurable: true });
    (ref as React.MutableRefObject<HTMLDivElement>).current = div;

    const { unmount } = renderHook(() => useScrollRestoration(ref));
    unmount();

    expect(sessionStorage.getItem('scroll_pos_/')).toBe('300');
  });

  it('유효하지 않은 저장값은 복원하지 않는다', () => {
    sessionStorage.setItem('scroll_pos_/', 'invalid');
    renderHook(() => useScrollRestoration());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
