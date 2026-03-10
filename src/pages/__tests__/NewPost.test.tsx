import { screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { NewPost } from '../NewPost';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { postsApi } from '../../lib/api';

const mockUser = { id: 1, name: '테스트 사용자', email: 'test@example.com' };

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

vi.mock('../../lib/api', () => ({
  postsApi: {
    create: vi.fn(),
    uploadImage: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('NewPost 페이지', () => {
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
  });

  afterEach(() => { vi.clearAllMocks(); });

  it('폼 입력 필드를 표시한다', () => {
    renderWithRouter(<NewPost />, { route: '/chadam/new' });

    expect(screen.getByPlaceholderText('제목을 입력하세요')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/내용을 입력하세요/)).toBeInTheDocument();
    expect(screen.getByText('광고/협찬 게시글')).toBeInTheDocument();
  });

  it('카테고리 버튼들을 표시한다', () => {
    renderWithRouter(<NewPost />, { route: '/chadam/new' });

    // 그룹 라벨
    expect(screen.getByText('질문·토론')).toBeInTheDocument();
    expect(screen.getByText('리뷰')).toBeInTheDocument();
    expect(screen.getByText('제보')).toBeInTheDocument();
    // 기본 그룹(질문·토론)의 세부 카테고리
    expect(screen.getByText('우림 질문')).toBeInTheDocument();
    expect(screen.getByText('맞춤 추천')).toBeInTheDocument();
    expect(screen.getByText('자유 토론')).toBeInTheDocument();
  });

  it('제목/내용이 비어 있으면 제출 버튼이 비활성화된다', () => {
    renderWithRouter(<NewPost />, { route: '/chadam/new' });

    const submitButton = screen.getByText('게시글 작성');
    expect(submitButton).toBeDisabled();
  });

  it('제목/내용 입력 후 제출 버튼이 활성화된다', () => {
    renderWithRouter(<NewPost />, { route: '/chadam/new' });

    fireEvent.change(screen.getByPlaceholderText('제목을 입력하세요'), {
      target: { value: '제목 입력' },
    });
    fireEvent.change(screen.getByPlaceholderText(/내용을 입력하세요/), {
      target: { value: '내용 입력' },
    });

    const submitButton = screen.getByText('게시글 작성');
    expect(submitButton).not.toBeDisabled();
  });

  it('비로그인 상태에서 로그인 페이지로 리다이렉트한다', () => {
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

    renderWithRouter(<NewPost />, { route: '/chadam/new' });
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('협찬 체크 시 협찬 입력 필드가 나타난다', () => {
    renderWithRouter(<NewPost />, { route: '/chadam/new' });

    const checkbox = screen.getByRole('checkbox', { name: /광고\/협찬/ });
    fireEvent.click(checkbox);

    expect(screen.getByPlaceholderText('협찬 다실 또는 내용을 입력하세요 (선택)')).toBeInTheDocument();
  });

  it('게시글 작성 성공 시 상세 페이지로 이동한다', async () => {
    vi.mocked(postsApi.create).mockResolvedValue({
      id: 1,
      userId: 1,
      user: { id: 1, name: '테스트', profileImageUrl: null },
      title: '제목',
      content: '내용',
      category: 'brewing_question',
      isSponsored: false,
      sponsorNote: null,
      viewCount: 0,
      likeCount: 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    renderWithRouter(<NewPost />, { route: '/chadam/new' });

    fireEvent.change(screen.getByPlaceholderText('제목을 입력하세요'), {
      target: { value: '제목 입력' },
    });
    fireEvent.change(screen.getByPlaceholderText(/내용을 입력하세요/), {
      target: { value: '내용 입력' },
    });

    fireEvent.click(screen.getByText('게시글 작성'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/chadam/1', { replace: true });
    });
  });
});
