import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { Cellar } from '../Cellar';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { cellarApi } from '../../lib/api';

const mockDate = new Date('2024-01-01T00:00:00.000Z');

const mockTea = {
  id: 1,
  name: '운남 보이차',
  type: '보이차',
  averageRating: 4.5,
  reviewCount: 10,
};

const mockCellarItems = [
  {
    id: 1,
    userId: 1,
    teaId: 1,
    tea: mockTea,
    quantity: 150,
    unit: 'g' as const,
    openedAt: '2024-01-01',
    remindAt: null,
    memo: '첫 번째 차',
    createdAt: mockDate,
    updatedAt: mockDate,
  },
  {
    id: 2,
    userId: 1,
    teaId: 2,
    tea: { ...mockTea, id: 2, name: '대홍포' },
    quantity: 50,
    unit: 'g' as const,
    openedAt: null,
    remindAt: null,
    memo: null,
    createdAt: mockDate,
    updatedAt: mockDate,
  },
];

const mockReminderItems = [
  {
    ...mockCellarItems[0],
    remindAt: '2024-01-01',
  },
];

const mockUser = {
  id: 1,
  name: '테스트 사용자',
  email: 'test@example.com',
};

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

vi.mock('../../lib/api', () => ({
  cellarApi: {
    getAll: vi.fn(),
    getReminders: vi.fn(),
    remove: vi.fn(),
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

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

describe('Cellar 페이지', () => {
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
      logout: vi.fn(),
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });
    vi.mocked(cellarApi.getAll).mockResolvedValue(mockCellarItems);
    vi.mocked(cellarApi.getReminders).mockResolvedValue([]);
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
      token: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      logout: vi.fn(),
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });

    renderWithRouter(<Cellar />, { route: '/cellar' });

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('셀러 아이템 목록을 표시한다', async () => {
    renderWithRouter(<Cellar />, { route: '/cellar' });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('내 셀러')).toBeInTheDocument();
    expect(screen.getByText('운남 보이차')).toBeInTheDocument();
    expect(screen.getByText('대홍포')).toBeInTheDocument();
  });

  it('빈 상태 메시지를 표시한다', async () => {
    vi.mocked(cellarApi.getAll).mockResolvedValue([]);

    renderWithRouter(<Cellar />, { route: '/cellar' });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText('보유한 차를 추가해보세요.')).toBeInTheDocument();
  });

  it('리마인더가 있을 때 배너를 표시한다', async () => {
    vi.mocked(cellarApi.getReminders).mockResolvedValue(mockReminderItems);

    renderWithRouter(<Cellar />, { route: '/cellar' });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 5000 });

    expect(screen.getByText(/1개의 차가 오늘 리마인더 기한입니다/)).toBeInTheDocument();
  });

  it('로딩 중에 스피너를 표시한다', () => {
    vi.mocked(cellarApi.getAll).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Cellar />, { route: '/cellar' });

    expect(screen.getByRole('status', { name: /로딩/i })).toBeInTheDocument();
  });

  it('API 에러 시 에러 토스트를 표시한다', async () => {
    mockToastError.mockClear();
    vi.mocked(cellarApi.getAll).mockRejectedValue(new Error('API Error'));

    renderWithRouter(<Cellar />, { route: '/cellar' });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockToastError).toHaveBeenCalledWith('보유 차 목록을 불러오는데 실패했습니다.');
  });

  it('"차 추가" 버튼 클릭 시 /cellar/new로 이동한다', async () => {
    const { getByRole } = renderWithRouter(<Cellar />, { route: '/cellar' });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /로딩/i })).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const addButton = getByRole('button', { name: '차 추가' });
    addButton.click();

    expect(mockNavigate).toHaveBeenCalledWith('/cellar/new');
  });

  it('인증 로딩 중에는 로딩 스피너를 표시한다', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      token: null,
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      logout: vi.fn(),
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });

    renderWithRouter(<Cellar />, { route: '/cellar' });

    expect(screen.getByRole('status', { name: /로딩/i })).toBeInTheDocument();
  });
});
