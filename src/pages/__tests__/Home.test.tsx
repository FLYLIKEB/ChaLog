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
    ratings: {
      richness: 4,
      strength: 4,
      smoothness: 5,
      clarity: 5,
      complexity: 4,
    },
    memo: '공개 차록입니다.',
    isPublic: true,
    createdAt: mockDate,
  },
  {
    id: 2,
    teaId: 2,
    teaName: '무이암차',
    userId: 2,
    userName: '이다원',
    rating: 4.2,
    ratings: {
      richness: 3,
      strength: 3,
      smoothness: 4,
      clarity: 4,
      complexity: 3,
    },
    memo: '비공개 차록입니다.',
    isPublic: false,
    createdAt: mockDate,
  },
];

vi.mock('../../lib/api', () => ({
  notesApi: {
    getAll: vi.fn(() => Promise.resolve(mockNotes.filter(note => note.isPublic))),
  },
  teasApi: {
    getAll: vi.fn(() => Promise.resolve([])),
    getTrending: vi.fn(() => Promise.resolve([])),
  },
  usersApi: {
    getTrending: vi.fn(() => Promise.resolve([])),
  },
  authApi: {
    getMe: vi.fn(() => Promise.resolve({ user: null })),
  },
  tagsApi: {
    getFollowedTags: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../contexts/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('Home 페이지', () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    mathRandomSpy.mockRestore();
  });

  it('공개 차록을 렌더링하고 인기차 섹션은 표시하지 않는다', async () => {
    renderWithRouter(<Home />, { route: '/' });

    // Wait for loading to finish and content to appear
    await waitFor(() => {
      expect(screen.getByText('차록 흐름')).toBeInTheDocument();
    }, { timeout: 5000 });

    // 공개 차록의 차 이름이 NoteCard를 통해 표시됨
    expect(screen.getByRole('heading', { name: '화과향' })).toBeInTheDocument();
    // 인기차 섹션은 검색-탐색 페이지로 이동했으므로 없어야 함
    expect(screen.queryByText(/요즘 인기 차/)).not.toBeInTheDocument();
    expect(screen.queryByText(/인기 다우/)).not.toBeInTheDocument();
  });
});

