import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionHistory } from '../SessionHistory';
import { teaSessionsApi } from '../../lib/api';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn(() => ({
  user: { id: 1, email: 'test@example.com', name: '테스트 유저' },
  token: 'mock-token',
  isLoading: false,
  isAuthenticated: true,
  hasCompletedOnboarding: true,
  isOnboardingLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
  register: vi.fn(),
  loginWithKakao: vi.fn(),
  refreshOnboardingStatus: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  const mockGetAll = vi.fn();
  return {
    ...actual,
    teaSessionsApi: {
      ...actual.teaSessionsApi,
      getAll: mockGetAll,
    },
    notificationsApi: {
      getUnreadCount: vi.fn(() => Promise.resolve({ count: 0 })),
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
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

const makeSession = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  userId: 1,
  teaId: 1,
  tea: { id: 1, name: '동방미인', type: '녹차' },
  noteId: null,
  steeps: [],
  createdAt: '2024-01-01T12:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

function renderWithRouter(ui: React.ReactElement, { route = '/sessions' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
  );
}

describe('SessionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teaSessionsApi.getAll).mockResolvedValue([]);
  });

  it('세션 목록을 렌더링한다', async () => {
    vi.mocked(teaSessionsApi.getAll).mockResolvedValue([
      makeSession({ id: 1, tea: { id: 1, name: '동방미인', type: '녹차' } }),
    ]);

    renderWithRouter(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getByText('동방미인')).toBeInTheDocument();
    });
  });

  it('세션이 없으면 빈 상태를 표시한다', async () => {
    vi.mocked(teaSessionsApi.getAll).mockResolvedValue([]);

    renderWithRouter(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getByText('아직 다회 세션이 없습니다.')).toBeInTheDocument();
    });
  });

  it('새 세션 시작하기 클릭 시 /session/new으로 이동한다', async () => {
    vi.mocked(teaSessionsApi.getAll).mockResolvedValue([]);

    renderWithRouter(<SessionHistory />);

    await waitFor(() => {
      expect(screen.getByText('새 세션 시작하기')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('새 세션 시작하기'));

    expect(mockNavigate).toHaveBeenCalledWith('/session/new');
  });
});
