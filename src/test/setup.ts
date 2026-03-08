import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.removeItem('chalog-theme-test');
});

// 테스트 환경에서 실제 네트워크 호출 방지
// 모든 unmocked 요청에 404 반환 (외부 API 포함). 테스트는 vi.spyOn 등으로 개별 mock.
const canned404 = (): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'Content-Type': 'application/json' },
    })
  );

const defaultFetch = (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
  return canned404();
};
globalThis.fetch = defaultFetch;

class ResizeObserverMock implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(_target: Element): void {
    // noop
  }

  unobserve(_target: Element): void {
    // noop
  }

  disconnect(): void {
    // noop
  }

  takeRecords(): ResizeObserverEntry[] {
    return [];
  }

  /**
   * Helper to manually trigger callbacks in tests if needed.
   */
  _trigger(entries: ResizeObserverEntry[], observer: ResizeObserver = this): void {
    this.callback(entries, observer);
  }
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  (window as unknown as Window & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock;
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver =
    ResizeObserverMock;
}

// Radix Select / jsdom polyfills
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

