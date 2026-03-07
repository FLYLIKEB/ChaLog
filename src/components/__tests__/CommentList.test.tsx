import { screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { CommentList } from '../CommentList';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { commentsApi } from '../../lib/api';
import { Comment } from '../../types';

const mockDate = new Date('2025-01-01T00:00:00.000Z');

const mockComments: Comment[] = [
  {
    id: 1,
    postId: 1,
    userId: 2,
    user: { id: 2, name: '김차인', profileImageUrl: null },
    content: '첫 번째 댓글입니다.',
    createdAt: mockDate,
    updatedAt: mockDate,
  },
];

const mockUser = { id: 1, name: '테스트 사용자', email: 'test@example.com' };

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

vi.mock('../../lib/api', () => ({
  commentsApi: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('CommentList 컴포넌트', () => {
  const onCommentsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      token: 'mock-token',
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      hasCompletedOnboarding: true,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('댓글 목록을 표시한다', () => {
    renderWithRouter(
      <CommentList postId={1} comments={mockComments} onCommentsChange={onCommentsChange} />,
    );
    expect(screen.getByText('첫 번째 댓글입니다.')).toBeInTheDocument();
    expect(screen.getByText('김차인')).toBeInTheDocument();
  });

  it('댓글이 없을 때 안내 메시지를 표시한다', () => {
    renderWithRouter(
      <CommentList postId={1} comments={[]} onCommentsChange={onCommentsChange} />,
    );
    expect(screen.getByText('첫 번째 댓글을 남겨보세요.')).toBeInTheDocument();
  });

  it('로그인 사용자에게 댓글 입력 폼을 표시한다', () => {
    renderWithRouter(
      <CommentList postId={1} comments={[]} onCommentsChange={onCommentsChange} />,
    );
    expect(screen.getByPlaceholderText('댓글을 입력하세요...')).toBeInTheDocument();
  });

  it('비로그인 사용자에게 댓글 입력 안내를 표시한다', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });

    renderWithRouter(
      <CommentList postId={1} comments={[]} onCommentsChange={onCommentsChange} />,
    );
    expect(screen.getByText('댓글을 작성하려면 로그인이 필요합니다.')).toBeInTheDocument();
  });

  it('댓글 작성 버튼 클릭 시 API를 호출한다', async () => {
    const newComment: Comment = {
      id: 2,
      postId: 1,
      userId: 1,
      user: { id: 1, name: '테스트 사용자', profileImageUrl: null },
      content: '새 댓글',
      createdAt: mockDate,
      updatedAt: mockDate,
    };
    vi.mocked(commentsApi.create).mockResolvedValue(newComment);

    renderWithRouter(
      <CommentList postId={1} comments={[]} onCommentsChange={onCommentsChange} />,
    );

    fireEvent.change(screen.getByPlaceholderText('댓글을 입력하세요...'), {
      target: { value: '새 댓글' },
    });
    fireEvent.click(screen.getByText('댓글 작성'));

    await waitFor(() => {
      expect(commentsApi.create).toHaveBeenCalledWith(1, '새 댓글');
      expect(onCommentsChange).toHaveBeenCalled();
    });
  });

  it('작성자 본인 댓글에 수정/삭제 버튼을 표시한다', () => {
    const myComment: Comment = { ...mockComments[0], userId: mockUser.id };
    renderWithRouter(
      <CommentList postId={1} comments={[myComment]} onCommentsChange={onCommentsChange} />,
    );
    expect(screen.getByLabelText('댓글 수정')).toBeInTheDocument();
    expect(screen.getByLabelText('댓글 삭제')).toBeInTheDocument();
  });

  it('타인 댓글에 수정/삭제 버튼을 표시하지 않는다', () => {
    renderWithRouter(
      <CommentList postId={1} comments={mockComments} onCommentsChange={onCommentsChange} />,
    );
    expect(screen.queryByLabelText('댓글 수정')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('댓글 삭제')).not.toBeInTheDocument();
  });
});
