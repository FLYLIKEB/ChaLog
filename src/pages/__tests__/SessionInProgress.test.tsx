import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionInProgress } from '../SessionInProgress';
import { teaSessionsApi } from '../../lib/api';

const mockNavigate = vi.fn();
const mockUseAuth = vi.fn(() => ({
  user: { id: 1 },
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
    teaSessionsApi: {
      getById: vi.fn(),
      addSteep: vi.fn(),
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

function renderWithRouter(sessionId: number) {
  return render(
    <MemoryRouter initialEntries={[`/session/${sessionId}`]}>
      <Routes>
        <Route path="/session/:id" element={<SessionInProgress />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SessionInProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('세션 로드 후 타이머와 탕 완료 버튼을 표시한다', async () => {
    vi.mocked(teaSessionsApi.getById).mockResolvedValue(makeSession() as any);

    renderWithRouter(1);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /탕 완료/ })).toBeInTheDocument();
    });
    expect(screen.getByText('동방미인')).toBeInTheDocument();
  });

  it('세션 마무리 버튼 클릭 시 /session/:id/summary로 이동한다', async () => {
    vi.mocked(teaSessionsApi.getById).mockResolvedValue(makeSession() as any);

    renderWithRouter(1);

    await waitFor(() => {
      expect(screen.getByText('세션 마무리하고 차록 쓰기')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('세션 마무리하고 차록 쓰기'));

    expect(mockNavigate).toHaveBeenCalledWith('/session/1/summary');
  });
});
