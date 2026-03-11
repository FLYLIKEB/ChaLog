import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { Community } from '../Community';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { postsApi } from '../../lib/api';

const mockDate = new Date('2025-01-01T00:00:00.000Z');

const mockPosts = [
  {
    id: 1,
    userId: 1,
    user: { id: 1, name: '김차인', profileImageUrl: null },
    title: '우림 질문입니다',
    content: '어떻게 우리면 좋을까요?',
    category: 'brewing_question' as const,
    isSponsored: false,
    sponsorNote: null,
    viewCount: 10,
    likeCount: 3,
    isLiked: false,
    isBookmarked: false,
    createdAt: mockDate,
    updatedAt: mockDate,
  },
  {
    id: 2,
    userId: 2,
    user: { id: 2, name: '이다원', profileImageUrl: null },
    title: '엄선 게시글',
    content: '이 차 강추합니다!',
    category: 'recommendation' as const,
    isSponsored: true,
    sponsorNote: '다실 A',
    viewCount: 5,
    likeCount: 1,
    isLiked: false,
    isBookmarked: false,
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
  postsApi: { getAll: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('Community 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isAdmin: false,
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
    vi.mocked(postsApi.getAll).mockResolvedValue(mockPosts);
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('게시글 목록을 표시한다', async () => {
    renderWithRouter(<Community />, { route: '/chadam' });

    await waitFor(() => {
      expect(screen.getAllByText('우림 질문입니다').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('엄선 게시글').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('대분류 탭을 표시한다', () => {
    renderWithRouter(<Community />, { route: '/chadam' });
    expect(screen.getByText('전체')).toBeInTheDocument();
    expect(screen.getByText('질문·토론')).toBeInTheDocument();
    expect(screen.getByText('리뷰')).toBeInTheDocument();
    expect(screen.getByText('공지')).toBeInTheDocument();
    expect(screen.getByText('제보')).toBeInTheDocument();
  });

  it('게시글이 없을 때 빈 상태를 표시한다', async () => {
    vi.mocked(postsApi.getAll).mockResolvedValue([]);
    renderWithRouter(<Community />, { route: '/chadam' });

    await waitFor(() => {
      expect(screen.getByText('첫 번째 게시글을 작성해보세요!')).toBeInTheDocument();
    });
  });

  it('로그인 사용자에게 새 글 작성 버튼을 표시한다', async () => {
    renderWithRouter(<Community />, { route: '/chadam' });

    await waitFor(() => {
      expect(screen.getByLabelText('새 게시글 작성')).toBeInTheDocument();
    });
  });

  it('비로그인 사용자에게 새 글 작성 버튼을 표시하지 않는다', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
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
    vi.mocked(postsApi.getAll).mockResolvedValue(mockPosts);

    renderWithRouter(<Community />, { route: '/chadam' });

    await waitFor(() => {
      expect(screen.getAllByText('우림 질문입니다').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.queryByLabelText('새 게시글 작성')).not.toBeInTheDocument();
  });
});
