import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Search } from '../Search';
import { renderWithRouter } from '../../test/renderWithRouter';

const mockTeas = [
  {
    id: 1,
    name: '무이암차',
    type: '청차/우롱차',
    seller: '티하우스',
    averageRating: 4.7,
    reviewCount: 15,
  },
  {
    id: 2,
    name: '진행백차',
    type: '백차',
    seller: '차상회',
    averageRating: 4.3,
    reviewCount: 8,
  },
];

const mockSellers = [
  { name: '탐색전용샵', teaCount: 5 },
  { name: '다실A', teaCount: 3 },
];

const mockPopularTags = [
  { name: '꽃향', noteCount: 10 },
  { name: '단맛', noteCount: 8 },
];

vi.mock('../../lib/api', () => ({
  teasApi: {
    getAll: vi.fn((query?: string) => {
      if (!query) {
        return Promise.resolve(mockTeas);
      }
      const filtered = mockTeas.filter(
        (tea) =>
          tea.name.toLowerCase().includes(query.toLowerCase()) ||
          tea.type.toLowerCase().includes(query.toLowerCase()) ||
          (tea.seller && tea.seller.toLowerCase().includes(query.toLowerCase())),
      );
      return Promise.resolve(filtered);
    }),
    getWithFilters: vi.fn(() => Promise.resolve(mockTeas)),
    getByTags: vi.fn(() => Promise.resolve(mockTeas)),
    getPopularRankings: vi.fn(() => Promise.resolve(mockTeas)),
    getNewRankings: vi.fn(() => Promise.resolve(mockTeas)),
    getCuration: vi.fn(() => Promise.resolve(mockTeas)),
    getSellers: vi.fn(() => Promise.resolve({ sellers: mockSellers })),
    getTrending: vi.fn(() => Promise.resolve(mockTeas)),
  },
  tagsApi: {
    getPopularTags: vi.fn(() => Promise.resolve(mockPopularTags)),
  },
  notesApi: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  cellarApi: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
  authApi: {
    getMe: vi.fn(() => Promise.resolve({ user: null })),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  const navigate = vi.fn();
  const setSearchParams = vi.fn();
  (globalThis as Record<string, unknown>).__navigate_spy__ = navigate;
  (globalThis as Record<string, unknown>).__setSearchParams_spy__ = setSearchParams;
  return {
    ...actual,
    useNavigate: () => navigate,
    useSearchParams: () => [new URLSearchParams(), setSearchParams],
  };
});

const getNavigateSpy = () => {
  const navigate = (globalThis as unknown as Record<string, ReturnType<typeof vi.fn> | undefined>)
    .__navigate_spy__;
  if (!navigate) {
    throw new Error('navigate spy is not initialised');
  }
  return navigate;
};

describe('Search 페이지', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('탐색 탭으로 전환 시 인기/신규/맞춤차 섹션이 표시된다', async () => {
    const user = userEvent.setup();
    const { container } = renderWithRouter(<Search />, { route: '/sasaek' });

    // tab switcher is a flex row with 검색/탐색 buttons inside bg-muted rounded-lg
    const tabContainer = container.querySelector('.bg-muted.rounded-lg');
    const tabButtons = tabContainer ? Array.from(tabContainer.querySelectorAll('button')) : [];
    const exploreTabBtn = tabButtons.find((b) => b.textContent === '탐색');
    if (!exploreTabBtn) throw new Error('탐색 tab button not found');
    await user.click(exploreTabBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/사랑받는 차/).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
    expect(screen.getAllByText(/신규 차/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/맞춤차/).length).toBeGreaterThan(0);
  });

  it('검색어와 일치하는 차를 렌더링한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/sasaek' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '무이');

    expect(await screen.findByText('무이암차')).toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
  });

  it('일치하는 차가 없으면 빈 상태를 보여준다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/sasaek' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '없는차');

    expect(await screen.findByText('검색 결과가 없어요.')).toBeInTheDocument();
  });

  it('탐색 탭에서 찻집/다실 목록을 표시한다', async () => {
    const user = userEvent.setup();
    const { container } = renderWithRouter(<Search />, { route: '/sasaek' });

    const tabContainer = container.querySelector('.bg-muted.rounded-lg');
    const tabButtons = tabContainer ? Array.from(tabContainer.querySelectorAll('button')) : [];
    const exploreTabBtn = tabButtons.find((b) => b.textContent === '탐색');
    if (!exploreTabBtn) throw new Error('탐색 tab button not found');
    await user.click(exploreTabBtn);

    await waitFor(() => {
      expect(screen.getByText('탐색전용샵')).toBeInTheDocument();
    });
    expect(screen.getByText('다실A')).toBeInTheDocument();
  });

  it('새 차 등록 버튼이 표시된다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/sasaek' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '테스트');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /새 차 등록/ })).toBeInTheDocument();
    });
  });

  it('새 차 등록 버튼 클릭 시 새 차 등록 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/sasaek' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '테스트');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /새 차 등록/ })).toBeInTheDocument();
    });

    const newTeaButton = screen.getByRole('button', { name: /새 차 등록/ });
    await user.click(newTeaButton);

    expect(getNavigateSpy()).toHaveBeenCalledWith('/tea/new');
  });

  it('필터 UI가 초기에도 표시된다 (검색어 없이도 필터 접근 가능)', async () => {
    renderWithRouter(<Search />, { route: '/sasaek' });

    await waitFor(() => {
      expect(screen.getByText('필터')).toBeInTheDocument();
    });
  });

  it('필터 패널을 클릭하면 정렬 옵션이 표시된다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/sasaek' });

    const filterButton = await screen.findByText('필터');
    await user.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('인기순')).toBeInTheDocument();
    });
  });

  it('검색어 없이 필터 적용 시 getWithFilters가 호출된다', async () => {
    const { teasApi } = await import('../../lib/api');
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/sasaek' });

    const filterButton = await screen.findByText('필터');
    await user.click(filterButton);

    const applyButton = await screen.findByRole('button', { name: '적용' });
    await user.click(applyButton);

    await waitFor(() => {
      expect(teasApi.getWithFilters).toHaveBeenCalled();
    });
  });
});
