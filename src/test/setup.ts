import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

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

