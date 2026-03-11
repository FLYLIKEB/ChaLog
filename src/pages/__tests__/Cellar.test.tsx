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
    notificationsApi: {
      getUnreadCount: vi.fn(() => Promise.resolve({ count: 0 })),
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
      expect(screen.getByText('아직 찻장에 차가 없습니다.')).toBeInTheDocument();
    });
  });

  it('찻장 아이템 목록을 렌더링한다', async () => {
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
      remindAt: new Date(Date.now() - 1000).toISOString() as any,
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

  it('차록 작성 버튼 클릭 시 /note/new로 이동한다', async () => {
    const items = [makeItem({ teaId: 5, tea: makeTea(5, '테스트 차') as any })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    // CellarCard 내의 "차록" 버튼 찾기 (BottomNav의 "내 차록" 버튼과 구별)
    await waitFor(() => {
      expect(screen.getByText('테스트 차')).toBeInTheDocument();
    });
    const cardButtons = screen.getAllByRole('button', { name: /차록/ });
    const noteBtn = cardButtons.find((btn) => btn.textContent?.trim() === '차록');
    expect(noteBtn).toBeDefined();
    await userEvent.click(noteBtn!);

    expect(mockNavigate).toHaveBeenCalledWith('/note/new?teaId=5');
  });

  it('개봉일이 있는 아이템은 개봉일을 표시한다', async () => {
    const items = [makeItem({ openedAt: '2024-03-01' as any })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    await waitFor(() => {
      // 카드 내 "개봉일: 2024.03.01" 문자열 확인 (p 태그)
      expect(screen.getByText(/2024\.03\.01/)).toBeInTheDocument();
      // 개봉일 레이블이 포함된 p 태그가 존재하는지 확인
      const allTexts = screen.getAllByText(/개봉일/);
      const cardLabel = allTexts.find((el) => el.tagName === 'P');
      expect(cardLabel).toBeInTheDocument();
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

  // ── 필터 테스트 ──────────────────────────────────────────────────────────

  it('아이템이 있으면 차 종류 필터 칩이 렌더링된다', async () => {
    const items = [
      makeItem({ id: 1, tea: makeTea(1, '동방미인', '청차/우롱차') as any }),
      makeItem({ id: 2, teaId: 2, tea: makeTea(2, '보성 녹차', '녹차') as any }),
    ];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    await waitFor(() => {
      expect(screen.getByRole('group', { name: '차 종류 필터' })).toBeInTheDocument();
      expect(screen.getByText(/전체 2/)).toBeInTheDocument();
      expect(screen.getByText(/우롱차 1/)).toBeInTheDocument();
      expect(screen.getByText(/녹차 1/)).toBeInTheDocument();
    });
  });

  it('종류 칩 클릭 시 해당 종류 아이템만 표시된다', async () => {
    const items = [
      makeItem({ id: 1, tea: makeTea(1, '동방미인', '청차/우롱차') as any }),
      makeItem({ id: 2, teaId: 2, tea: makeTea(2, '보성 녹차', '녹차') as any }),
    ];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    const chip = await screen.findByText(/우롱차 1/);
    await userEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByText('동방미인')).toBeInTheDocument();
      expect(screen.queryByText('보성 녹차')).not.toBeInTheDocument();
    });
  });

  it('전체 칩 클릭 시 모든 아이템이 다시 표시된다', async () => {
    const items = [
      makeItem({ id: 1, tea: makeTea(1, '동방미인', '청차/우롱차') as any }),
      makeItem({ id: 2, teaId: 2, tea: makeTea(2, '보성 녹차', '녹차') as any }),
    ];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    // 먼저 우롱차 필터 적용
    const chip = await screen.findByText(/우롱차 1/);
    await userEvent.click(chip);

    // 전체 칩 클릭
    const allChip = screen.getByText(/전체 2/);
    await userEvent.click(allChip);

    await waitFor(() => {
      expect(screen.getByText('동방미인')).toBeInTheDocument();
      expect(screen.getByText('보성 녹차')).toBeInTheDocument();
    });
  });

  it('필터 결과가 없으면 "해당 종류의 차가 없습니다" 메시지를 표시한다', async () => {
    // 녹차만 있는데 홍차 필터를 칩으로 선택하는 시나리오:
    // 홍차 칩은 count=0이라 opacity-40이지만 클릭은 가능
    const items = [makeItem({ id: 1, tea: makeTea(1, '보성 녹차', '녹차') as any })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    const chip = await screen.findByText(/홍차 0/);
    await userEvent.click(chip);

    await waitFor(() => {
      expect(screen.getByText('해당 종류의 차가 없습니다.')).toBeInTheDocument();
    });
  });

  // ── 정렬 테스트 ──────────────────────────────────────────────────────────

  it('정렬 기준 버튼이 렌더링되고 클릭 시 옵션 목록이 표시된다', async () => {
    const items = [makeItem({ id: 1, tea: makeTea(1, '동방미인') as any })];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    const sortBtn = await screen.findByRole('button', { name: '정렬 기준' });
    expect(sortBtn).toBeInTheDocument();
    expect(sortBtn).toHaveTextContent('추가일');

    // 클릭 시 옵션 목록 표시
    await userEvent.click(sortBtn);
    expect(screen.getByRole('listbox', { name: '정렬 옵션' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '리마인더' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '이름' })).toBeInTheDocument();
  });

  it('정렬 옵션 선택 시 해당 기준으로 목록이 정렬된다', async () => {
    const items = [
      makeItem({ id: 1, tea: makeTea(1, '많은차') as any, quantity: 100 }),
      makeItem({ id: 2, teaId: 2, tea: makeTea(2, '적은차') as any, quantity: 10 }),
    ];
    vi.mocked(cellarApi.getAll).mockResolvedValue(items);

    renderCellar();

    // 정렬 기준 버튼 클릭 → 옵션 목록 열기
    const sortBtn = await screen.findByRole('button', { name: '정렬 기준' });
    await userEvent.click(sortBtn);

    // "잔량" 옵션 선택 (desc 기본 → 많은순)
    await userEvent.click(screen.getByRole('option', { name: '잔량' }));

    await waitFor(() => {
      expect(sortBtn).toHaveTextContent('잔량');
      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards[0]).toHaveTextContent('많은차');
    });

    // 같은 옵션 다시 선택 → 방향 토글 (desc → asc, 적은순)
    const sortBtn2 = screen.getByRole('button', { name: '정렬 기준' });
    await userEvent.click(sortBtn2); // 목록 열기
    await userEvent.click(screen.getByRole('option', { name: '잔량' })); // 같은 옵션 → 방향 토글

    await waitFor(() => {
      const cards = screen.getAllByRole('heading', { level: 3 });
      expect(cards[0]).toHaveTextContent('적은차');
    });
  });

  it('로그인하지 않은 사용자는 로그인 페이지로 리다이렉트', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      hasCompletedOnboarding: null,
      isOnboardingLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      refreshOnboardingStatus: vi.fn(),
    });

    renderCellar();

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
