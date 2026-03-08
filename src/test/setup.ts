import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// 테스트 환경에서 실제 네트워크 호출 방지 (ECONNREFUSED 에러 방지)
// API를 mock하지 않은 테스트에서 fetch가 호출되면 404 응답 반환
const originalFetch = globalThis.fetch;
const defaultFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input.toString();
  if (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('[::1]') ||
    url.includes('/api') ||
    url.startsWith('/')
  ) {
    return Promise.resolve(
      new Response(JSON.stringify({ message: 'Not found' }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  }
  return originalFetch.call(globalThis, input, init);
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

