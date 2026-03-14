import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePostForm } from '../usePostForm';
import React from 'react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../lib/api', () => ({
  postsApi: {
    create: vi.fn(() => Promise.resolve({ id: 42 })),
    update: vi.fn(() => Promise.resolve({ id: 1 })),
    getById: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 1, name: '김차인', email: 'test@example.com' },
      isAdmin: false,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('usePostForm - new 모드', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태: title 빈 문자열, content 빈 문자열, category brewing_question', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    expect(result.current.title).toBe('');
    expect(result.current.content).toBe('');
    expect(result.current.category).toBe('brewing_question');
    expect(result.current.isAnonymous).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('setTitle 호출 시 title 상태 업데이트', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    act(() => {
      result.current.setTitle('차 추천 부탁드립니다');
    });
    expect(result.current.title).toBe('차 추천 부탁드립니다');
  });

  it('setContent 호출 시 content 상태 업데이트', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    act(() => {
      result.current.setContent('내용입니다.');
    });
    expect(result.current.content).toBe('내용입니다.');
  });

  it('setCategory 호출 시 category 상태 업데이트', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    act(() => {
      result.current.setCategory('tea_review');
    });
    expect(result.current.category).toBe('tea_review');
  });

  it('setIsAnonymous 호출 시 isAnonymous 상태 업데이트', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    act(() => {
      result.current.setIsAnonymous(true);
    });
    expect(result.current.isAnonymous).toBe(true);
  });

  it('제목/내용 없이 submit → toast.error 호출', async () => {
    const { toast } = await import('sonner');
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(toast.error).toHaveBeenCalledWith('제목과 내용을 입력해주세요.');
  });

  it('제목/내용 입력 후 submit → postsApi.create 호출 및 navigate', async () => {
    const { postsApi } = await import('../../lib/api');
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));

    act(() => {
      result.current.setTitle('테스트 제목');
      result.current.setContent('테스트 내용입니다.');
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });

    expect(postsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: '테스트 제목', content: '테스트 내용입니다.' }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/chadam/42', { replace: true });
  });

  it('selectedGroup, setSelectedGroup 상태 업데이트', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    act(() => {
      result.current.setSelectedGroup('review');
    });
    expect(result.current.selectedGroup).toBe('review');
  });

  it('isLoadingPost: new 모드는 false', () => {
    const { result } = renderHook(() => usePostForm({ mode: 'new' }));
    expect(result.current.isLoadingPost).toBe(false);
  });
});
