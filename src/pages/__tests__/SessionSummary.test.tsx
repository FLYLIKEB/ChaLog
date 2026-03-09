import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SessionSummary } from '../SessionSummary';
import { teaSessionsApi, notesApi } from '../../lib/api';

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
      publish: vi.fn(),
    },
    notesApi: {
      getActiveSchemas: vi.fn(),
      getSchemaAxes: vi.fn(),
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
  steeps: [{ id: 1, steepNumber: 1, steepDurationSeconds: 30, aroma: null, taste: null, color: null, memo: null }],
  createdAt: '2024-01-01T12:00:00.000Z',
  updatedAt: '2024-01-01T12:00:00.000Z',
  ...overrides,
});

function renderWithRouter(sessionId: number) {
  return render(
    <MemoryRouter initialEntries={[`/session/${sessionId}/summary`]}>
      <Routes>
        <Route path="/session/:id/summary" element={<SessionSummary />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SessionSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(teaSessionsApi.getById).mockResolvedValue(makeSession() as any);
    vi.mocked(notesApi.getActiveSchemas).mockResolvedValue({
      schemas: [{ id: 1, nameKo: '기본', code: 'default', version: '1', nameEn: 'Default', overallMinValue: 1, overallMaxValue: 5, overallStep: 1, isActive: true }],
      pinnedSchemaIds: [1],
    } as any);
    vi.mocked(notesApi.getSchemaAxes).mockResolvedValue([]);
  });

  it('세션 요약과 노트 발행 버튼을 표시한다', async () => {
    renderWithRouter(1);

    await waitFor(() => {
      expect(screen.getByText(/동방미인/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /노트로 발행/ })).toBeInTheDocument();
  });

  it('탕 기록을 표시한다', async () => {
    renderWithRouter(1);

    await waitFor(() => {
      expect(screen.getByText(/30초/)).toBeInTheDocument();
    });
  });
});
