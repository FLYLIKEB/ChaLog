import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { Search } from '../Search';
import { renderWithRouter } from '../../test/renderWithRouter';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockTeas = [
  {
    id: 1,
    name: '무이암차',
    type: '우롱차',
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

vi.mock('../../lib/api', () => ({
  teasApi: {
    getAll: vi.fn((query?: string) => {
      if (!query) {
        return Promise.resolve(mockTeas);
      }
      // 검색 쿼리에 따라 필터링된 결과 반환
      const filtered = mockTeas.filter(tea =>
        tea.name.toLowerCase().includes(query.toLowerCase()) ||
        tea.type.toLowerCase().includes(query.toLowerCase()) ||
        (tea.seller && tea.seller.toLowerCase().includes(query.toLowerCase()))
      );
      return Promise.resolve(filtered);
    }),
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
  (globalThis as Record<string, unknown>).__navigate_spy__ = navigate;
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const getNavigateSpy = () => {
  const navigate = (globalThis as unknown as Record<string, ReturnType<typeof vi.fn> | undefined>).__navigate_spy__;
  if (!navigate) {
    throw new Error('navigate spy is not initialised');
  }
  return navigate;
};

describe('Search 페이지', () => {
  it('검색어가 없으면 안내 메시지를 보여준다', () => {
    renderWithRouter(<Search />, { route: '/search' });

    expect(screen.getByText('검색어를 입력해주세요.')).toBeInTheDocument();
  });

  it('검색어와 일치하는 차를 렌더링한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/search' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '무이');

    expect(await screen.findByText('무이암차')).toBeInTheDocument();
    expect(screen.queryByText('검색 결과가 없습니다.')).not.toBeInTheDocument();
  });

  it('일치하는 차가 없으면 빈 상태를 보여준다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/search' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '없는차');

    expect(await screen.findByText('검색 결과가 없습니다.')).toBeInTheDocument();
  });

  it('새 차 등록 버튼이 표시된다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/search' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '테스트');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /새 차 등록/ })).toBeInTheDocument();
    });
  });

  it('새 차 등록 버튼 클릭 시 새 차 등록 페이지로 이동한다', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Search />, { route: '/search' });

    const input = screen.getByPlaceholderText('차 이름, 종류, 구매처로 검색...');
    await user.type(input, '테스트');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /새 차 등록/ })).toBeInTheDocument();
    });

    const newTeaButton = screen.getByRole('button', { name: /새 차 등록/ });
    await user.click(newTeaButton);

    expect(getNavigateSpy()).toHaveBeenCalledWith('/tea/new');
  });
});

