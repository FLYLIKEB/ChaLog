import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Cellar } from '../Cellar';
import { cellarApi } from '../../lib/api';
import { CellarItem } from '../../types';

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

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    cellarApi: {
      getAll: vi.fn(),
      getReminders: vi.fn(),
      remove: vi.fn(),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

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

const makeTea = (id: number, name: string, type = '녹차') => ({
  id,
  name,
  type,
  averageRating: 4.0,
  reviewCount: 5,
  year: 2023,
  seller: null,
  origin: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const makeItem = (overrides: Partial<CellarItem> = {}): CellarItem => ({
  id: 1,
  teaId: 1,
  tea: makeTea(1, '동방미인') as any,
  quantity: 50,
  unit: 'g',
  openedAt: null,
  remindAt: null,
  memo: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

function renderCellar() {
  return render(
    <MemoryRouter initialEntries={['/cellar']}>
      <Cellar />
    </MemoryRouter>,
  );
}

describe('Cellar 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
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
    });
    vi.mocked(cellarApi.getAll).mockResolvedValue([]);
    vi.mocked(cellarApi.getReminders).mockResolvedValue([]);
  });

  it('로딩 후 빈 상태 메시지를 표시한다', async () => {
    renderCellar();

    await waitFor(() => {
      expect(screen.getByText('아직 셀러에 차가 없습니다.')).toBeInTheDocument();
    });
  });

  it('셀러 아이템 목록을 렌더링한다', async () => {
    const items = [
      makeItem({ id: 1, tea: makeTea(1, '동방미인') as any }),
      makeItem({ id: 2, teaId: 2, tea: makeTea(2, '대홍포') as any, quantity: 30 }),
    ];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    await waitFor(() => {
      expect(screen.getByText('동방미인')).toBeInTheDocument();
      expect(screen.getByText('대홍포')).toBeInTheDocument();
    });
  });

  it('리마인더 배너를 표시한다', async () => {
    const reminderItem = makeItem({
      remindAt: new Date(Date.now() - 1000).toISOString(),
      tea: makeTea(1, '리마인더 차') as any,
    });
    vi.mocked(cellarApi.getAll).mockResolvedValue([reminderItem]);
    vi.mocked(cellarApi.getReminders).mockResolvedValue([reminderItem]);

    renderCellar();

    await waitFor(() => {
      expect(screen.getByText('리마인더 알림')).toBeInTheDocument();
      const reminderTexts = screen.getAllByText(/리마인더 차/);
      expect(reminderTexts.length).toBeGreaterThan(0);
    });
  });

  it('노트 작성 버튼 클릭 시 /note/new로 이동한다', async () => {
    const items = [makeItem({ teaId: 5, tea: makeTea(5, '테스트 차') as any })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    const noteBtn = await screen.findByRole('button', { name: /노트 작성/ });
    await userEvent.click(noteBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/note/new?teaId=5');
  });

  it('개봉일이 있는 아이템은 개봉일을 표시한다', async () => {
    const items = [makeItem({ openedAt: '2024-03-01' })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    await waitFor(() => {
      expect(screen.getByText(/개봉일/)).toBeInTheDocument();
      expect(screen.getByText(/2024.03.01/)).toBeInTheDocument();
    });
  });

  it('메모가 있는 아이템은 메모를 표시한다', async () => {
    const items = [makeItem({ memo: '이 차는 정말 맛있어요.' })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    await waitFor(() => {
      expect(screen.getByText('이 차는 정말 맛있어요.')).toBeInTheDocument();
    });
  });

  it('빈 상태에서 차 추가하기 버튼 클릭 시 /cellar/new로 이동한다', async () => {
    renderCellar();

    const addBtn = await screen.findByRole('button', { name: /차 추가하기/ });
    await userEvent.click(addBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/cellar/new');
  });
});
