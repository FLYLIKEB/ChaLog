import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { ShopDetail } from '../ShopDetail';
import { renderWithRouter } from '../../test/renderWithRouter';

const mockUseParams = vi.fn(() => ({ name: '테스트샵' }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

const mockShopTeas = [
  {
    id: 1,
    name: '샵테스트차1',
    type: '홍차',
    seller: '테스트샵',
    averageRating: 4.5,
    reviewCount: 10,
  },
  {
    id: 2,
    name: '샵테스트차2',
    type: '녹차',
    seller: '테스트샵',
    averageRating: 4.0,
    reviewCount: 5,
  },
];

vi.mock('../../lib/api', () => ({
  teasApi: {
    getBySeller: vi.fn((name: string) => {
      if (name === '테스트샵') {
        return Promise.resolve(mockShopTeas);
      }
      return Promise.resolve([]);
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

describe('ShopDetail 페이지', () => {
  it('샵명과 차 개수를 표시한다', async () => {
    mockUseParams.mockReturnValue({ name: '테스트샵' } as { name: string });
    renderWithRouter(<ShopDetail />, { route: '/shop/테스트샵' });

    expect(await screen.findByRole('heading', { name: '테스트샵' })).toBeInTheDocument();
    expect(screen.getByText('2종의 차')).toBeInTheDocument();
  });

  it('해당 seller의 차 목록을 렌더링한다', async () => {
    mockUseParams.mockReturnValue({ name: '테스트샵' });
    renderWithRouter(<ShopDetail />, { route: '/shop/테스트샵' });

    await waitFor(() => {
      expect(screen.getByText('샵테스트차1')).toBeInTheDocument();
    });
    expect(screen.getByText('샵테스트차2')).toBeInTheDocument();
  });

  it('빈 seller일 때 안내 메시지를 표시한다', async () => {
    mockUseParams.mockReturnValue({ name: '빈샵' });
    renderWithRouter(<ShopDetail />, { route: '/shop/빈샵' });

    await waitFor(() => {
      expect(screen.getByText('이 샵에 등록된 차가 없습니다.')).toBeInTheDocument();
    });
  });
});
