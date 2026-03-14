import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearchFilters } from '../useSearchFilters';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('../../lib/api', () => ({
  teasApi: {
    getWithFilters: vi.fn(() => Promise.resolve([])),
    getByTags: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

function makeWrapper(initialEntries: string[] = ['/search']) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries }, children);
}

describe('useSearchFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태: filterType null, filterMinRating undefined, filterSort popular', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.filterType).toBeNull();
    expect(result.current.filterMinRating).toBeUndefined();
    expect(result.current.filterSort).toBe('popular');
    expect(result.current.noteSort).toBe('latest');
    expect(result.current.filterOpen).toBe(false);
  });

  it('setFilterType 호출 시 filterType 업데이트', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setFilterType('녹차');
    });

    expect(result.current.filterType).toBe('녹차');
  });

  it('setFilterMinRating 호출 시 filterMinRating 업데이트', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setFilterMinRating(4);
    });

    expect(result.current.filterMinRating).toBe(4);
  });

  it('setFilterSort 호출 시 filterSort 업데이트', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setFilterSort('new');
    });

    expect(result.current.filterSort).toBe('new');
  });

  it('setNoteSort 호출 시 noteSort 업데이트', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setNoteSort('rating');
    });

    expect(result.current.noteSort).toBe('rating');
  });

  it('setFilterOpen 호출 시 filterOpen 업데이트', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setFilterOpen(true);
    });

    expect(result.current.filterOpen).toBe(true);
  });

  it('activeFilterCount: 아무 필터 없으면 0', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.activeFilterCount).toBe(0);
  });

  it('activeFilterCount: filterType 설정 시 1', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    act(() => {
      result.current.setFilterType('홍차');
    });

    expect(result.current.activeFilterCount).toBe(1);
  });

  it('URL에 sort 파라미터 있으면 filterSort 초기화', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(['/search?sort=rating']),
    });

    expect(result.current.filterSort).toBe('rating');
  });

  it('URL에 type 파라미터 있으면 filterType 초기화', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(['/search?type=백차']),
    });

    expect(result.current.filterType).toBe('백차');
  });

  it('fetchWithFilters 호출 시 teasApi.getWithFilters 호출', async () => {
    const { teasApi } = await import('../../lib/api');
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    const setTeas = vi.fn();
    const setIsLoading = vi.fn();

    await act(async () => {
      await result.current.fetchWithFilters(
        { q: '녹차', sort: 'popular' },
        { setTeas, setIsLoading },
      );
    });

    expect(teasApi.getWithFilters).toHaveBeenCalledWith(
      expect.objectContaining({ q: '녹차' }),
    );
    expect(setTeas).toHaveBeenCalledWith([]);
  });

  it('fetchWithFilters - tags 있으면 teasApi.getByTags 호출', async () => {
    const { teasApi } = await import('../../lib/api');
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    const setTeas = vi.fn();
    const setIsLoading = vi.fn();

    await act(async () => {
      await result.current.fetchWithFilters(
        { tags: ['꽃향', '부드러움'], sort: 'match' },
        { setTeas, setIsLoading },
      );
    });

    expect(teasApi.getByTags).toHaveBeenCalledWith(['꽃향', '부드러움'], 'match', 50);
  });

  it('hasTagParams: URL에 tags 없으면 false', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.hasTagParams).toBe(false);
  });

  it('hasFilterParams: URL 파라미터 없으면 false', () => {
    const { result } = renderHook(() => useSearchFilters(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.hasFilterParams).toBe(false);
  });
});
