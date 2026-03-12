import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { Home } from '../Home';
import { renderWithRouter } from '../../test/renderWithRouter';

const mockDate = new Date('2024-11-10T00:00:00.000Z');

const mockNotes = [
  {
    id: 1,
    teaId: 1,
    teaName: '화과향',
    userId: 1,
    userName: '김차인',
    rating: 4.5,
    ratings: { richness: 4, strength: 4, smoothness: 5, clarity: 5, complexity: 4 },
    memo: '내 최근 차록입니다.',
    isPublic: true,
    createdAt: mockDate,
  },
];

vi.mock('../../lib/api', () => ({
  notesApi: {
    getAll: vi.fn(() => Promise.resolve(mockNotes)),
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 1, name: '김차인' },
      isLoading: false,
      isAuthenticated: true,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

describe('Home 페이지', () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    localStorage.clear();
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it('빠른 접근 버튼과 주간 캘린더를 렌더링한다', async () => {
    renderWithRouter(<Home />, { route: '/' });

    await waitFor(() => {
      expect(screen.getAllByText('차록 쓰기').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('탐색하기')).toBeInTheDocument();
    expect(screen.getAllByText('내 차록').length).toBeGreaterThan(0);
    // 주간 캘린더 요일 표시
    expect(screen.getAllByText('일').length).toBeGreaterThan(0);
  });

  it('로그인 시 최근 차록 섹션을 렌더링한다', async () => {
    renderWithRouter(<Home />, { route: '/' });

    await screen.findByText('최근 차록', {}, { timeout: 5000 });
    expect(screen.getByText('최근 차록')).toBeInTheDocument();
  });
});
