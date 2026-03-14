import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useNoteForm } from '../useNoteForm';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/api', () => ({
  notesApi: {
    getActiveSchemas: vi.fn(() =>
      Promise.resolve({
        schemas: [{ id: 1, code: 'standard', version: '1', nameKo: '기본', nameEn: 'Standard' }],
        pinnedSchemaIds: [1],
      }),
    ),
    getSchemaAxes: vi.fn(() =>
      Promise.resolve([
        { id: 10, schemaId: 1, code: 'richness', nameKo: '풍부함', nameEn: 'Richness', displayOrder: 1, minValue: 1, maxValue: 5 },
      ]),
    ),
    getById: vi.fn(),
    create: vi.fn(() => Promise.resolve({ id: 99 })),
    update: vi.fn(() => Promise.resolve({ id: 1 })),
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      user: { id: 1, name: '김차인', email: 'test@example.com' },
      isLoading: false,
    }),
  };
});

vi.mock('../../hooks/useTeaSelector', () => ({
  useTeaSelector: () => ({
    selectedTea: null,
    selectTea: vi.fn(),
    clearTea: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    searchResults: [],
    isSearching: false,
  }),
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
    warn: vi.fn(),
  },
}));

describe('useNoteForm - new 모드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태: overallRating null, memo 빈 문자열, isPublic false', () => {
    const { result } = renderHook(() =>
      useNoteForm({ mode: 'new' }),
    );
    expect(result.current.overallRating).toBeNull();
    expect(result.current.memo).toBe('');
    expect(result.current.isPublic).toBe(false);
    expect(result.current.isSaving).toBe(false);
  });

  it('setMemo 호출 시 memo 상태 업데이트', () => {
    const { result } = renderHook(() => useNoteForm({ mode: 'new' }));
    act(() => {
      result.current.setMemo('좋은 차였습니다.');
    });
    expect(result.current.memo).toBe('좋은 차였습니다.');
  });

  it('setOverallRating 호출 시 overallRating 업데이트', () => {
    const { result } = renderHook(() => useNoteForm({ mode: 'new' }));
    act(() => {
      result.current.setOverallRating(4.5);
    });
    expect(result.current.overallRating).toBe(4.5);
  });

  it('setIsPublic 호출 시 isPublic 업데이트', () => {
    const { result } = renderHook(() => useNoteForm({ mode: 'new' }));
    act(() => {
      result.current.setIsPublic(true);
    });
    expect(result.current.isPublic).toBe(true);
  });

  it('차 미선택 시 handleSave → toast.error 호출', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useNoteForm({ mode: 'new' }));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it('isSampleMode true 시 handleSave → 체험 완료 toast', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => useNoteForm({ mode: 'new', isSampleMode: true }));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('체험 완료'));
  });

  it('setImagesAndThumbnails 호출 시 images/imageThumbnails 업데이트', () => {
    const { result } = renderHook(() => useNoteForm({ mode: 'new' }));
    act(() => {
      result.current.setImagesAndThumbnails(['img1.jpg'], [null]);
    });
    expect(result.current.images).toEqual(['img1.jpg']);
    expect(result.current.imageThumbnails).toEqual([null]);
  });

  it('overallRating 설정 시 스키마 fetch 시작', async () => {
    const { notesApi } = await import('../../lib/api');
    const { result } = renderHook(() => useNoteForm({ mode: 'new' }));

    act(() => {
      result.current.setOverallRating(4);
    });

    await waitFor(() => {
      expect(notesApi.getActiveSchemas).toHaveBeenCalled();
    });
  });
});

describe('useNoteForm - edit 모드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('edit 모드 초기 상태: isLoading true', () => {
    const { result } = renderHook(() => useNoteForm({ mode: 'edit', noteId: 1 }));
    expect(result.current.isLoading).toBe(true);
  });
});
