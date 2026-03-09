import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SessionNew } from '../SessionNew';
import { teasApi, teaSessionsApi } from '../../lib/api';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn(() => ({
  user: { id: 1, email: 'test@example.com', name: '테스트 유저' },
  isAuthenticated: true,
  isLoading: false,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    teasApi: {
      getAll: vi.fn(),
      getById: vi.fn(),
    },
    teaSessionsApi: {
      create: vi.fn(),
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
    useSearchParams: () => [new URLSearchParams()],
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const makeTea = (id: number, name: string, type = '녹차') => ({
  id,
  name,
  type,
  averageRating: 4,
  reviewCount: 5,
});

function renderWithRouter(ui: React.ReactElement, { route = '/session/new' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
  );
}

describe('SessionNew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teasApi.getAll).mockResolvedValue([
      makeTea(1, '동방미인'),
      makeTea(2, '대홍포'),
    ]);
  });

  it('차 선택 UI를 렌더링한다', async () => {
    renderWithRouter(<SessionNew />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('차 이름으로 검색...')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /세션 시작/ })).toBeInTheDocument();
  });

  it('차 선택 후 세션 시작 시 API 호출하고 이동한다', async () => {
    vi.mocked(teaSessionsApi.create).mockResolvedValue({
      id: 1,
      teaId: 1,
      userId: 1,
      noteId: null,
      createdAt: '',
      updatedAt: '',
    } as any);

    renderWithRouter(<SessionNew />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('차 이름으로 검색...')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('차 이름으로 검색...');
    await userEvent.type(input, '동방');
    await waitFor(() => {
      expect(screen.getByText('동방미인')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('동방미인'));
    await userEvent.click(screen.getByRole('button', { name: /세션 시작/ }));

    await waitFor(() => {
      expect(teaSessionsApi.create).toHaveBeenCalledWith({ teaId: 1 });
      expect(mockNavigate).toHaveBeenCalledWith('/session/1');
    });
  });

  it('차 미선택 시 세션 시작 버튼이 비활성화된다', async () => {
    renderWithRouter(<SessionNew />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /세션 시작/ })).toBeDisabled();
    });
  });
});
