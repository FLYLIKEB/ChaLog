import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { Saved } from '../Saved';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { notesApi } from '../../lib/api';

const mockDate = new Date('2024-11-10T00:00:00.000Z');

const mockBookmarkedNotes = [
  {
    id: 1,
    teaId: 1,
    teaName: '화과향',
    userId: 1,
    userName: '김차인',
    schemaId: 1,
    overallRating: 4.5,
    isRatingIncluded: true,
    memo: '저장한 노트 1',
    isPublic: true,
    createdAt: mockDate,
    isBookmarked: true,
    likeCount: 5,
    isLiked: false,
  },
  {
    id: 2,
    teaId: 2,
    teaName: '무이암차',
    userId: 2,
    userName: '이다원',
    schemaId: 1,
    overallRating: 4.2,
    isRatingIncluded: true,
    memo: '저장한 노트 2',
    isPublic: true,
    createdAt: mockDate,
    isBookmarked: true,
    likeCount: 3,
    isLiked: false,
  },
];

const mockUser = {
  id: 1,
  name: '테스트 사용자',
  email: 'test@example.com',
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  notesApi: {
    getAll: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Saved 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });
    vi.mocked(notesApi.getAll).mockResolvedValue(mockBookmarkedNotes);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('로그인하지 않은 사용자는 로그인 페이지로 리다이렉트', () => {
    mockNavigate.mockClear();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithRouter(<Saved />, { route: '/saved' });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('북마크한 노트 리스트를 표시한다', async () => {
    renderWithRouter(<Saved />, { route: '/saved' });

    // 로딩이 완료될 때까지 대기
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('저장한 노트')).toBeInTheDocument();
    expect(screen.getByText('저장한 노트 1')).toBeInTheDocument();
    expect(screen.getByText('저장한 노트 2')).toBeInTheDocument();
  });

  it('빈 상태 메시지를 표시한다 (저장한 노트가 없을 때)', async () => {
    vi.mocked(notesApi.getAll).mockResolvedValue([]);

    renderWithRouter(<Saved />, { route: '/saved' });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('저장한 노트')).toBeInTheDocument();
    expect(screen.getByText('아직 저장한 노트가 없습니다.')).toBeInTheDocument();
  });

  it('로딩 상태를 표시한다', () => {
    vi.mocked(notesApi.getAll).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Saved />, { route: '/saved' });

    expect(screen.getByRole('status', { name: /로딩/i })).toBeInTheDocument();
  });

  it('API 에러 시 에러 메시지를 표시한다', async () => {
    const mockToast = require('sonner').toast;
    vi.mocked(notesApi.getAll).mockRejectedValue(new Error('API Error'));

    renderWithRouter(<Saved />, { route: '/saved' });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('저장한 노트를 불러오는데 실패했습니다.');
    }, { timeout: 5000 });
  });

  it('인증 로딩 중에는 로딩 스피너를 표시한다', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    });

    renderWithRouter(<Saved />, { route: '/saved' });

    expect(screen.getByRole('status', { name: /로딩/i })).toBeInTheDocument();
  });
});

