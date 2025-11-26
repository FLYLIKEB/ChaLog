import { screen } from '@testing-library/react';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { Home } from '../Home';
import { renderWithRouter } from '../../test/renderWithRouter';

const mockDate = new Date('2024-11-10T00:00:00.000Z');

const mockTeas = [
  {
    id: 'tea-a',
    name: '화과향',
    type: '백차',
    averageRating: 4.5,
    reviewCount: 20,
  },
  {
    id: 'tea-b',
    name: '무이암차',
    type: '우롱차',
    averageRating: 4.8,
    reviewCount: 12,
  },
];

const mockNotes = [
  {
    id: 'note-public',
    teaId: 'tea-a',
    teaName: '화과향',
    userId: 'user-1',
    userName: '김차인',
    rating: 4.5,
    ratings: {
      richness: 4,
      strength: 4,
      smoothness: 5,
      clarity: 5,
      complexity: 4,
    },
    memo: '공개 노트입니다.',
    isPublic: true,
    createdAt: mockDate,
  },
  {
    id: 'note-private',
    teaId: 'tea-b',
    teaName: '무이암차',
    userId: 'user-2',
    userName: '이다원',
    rating: 4.2,
    ratings: {
      richness: 3,
      strength: 3,
      smoothness: 4,
      clarity: 4,
      complexity: 3,
    },
    memo: '비공개 노트입니다.',
    isPublic: false,
    createdAt: mockDate,
  },
];

vi.mock('../../lib/api', () => ({
  teasApi: {
    getAll: vi.fn(() => Promise.resolve(mockTeas)),
  },
  notesApi: {
    getAll: vi.fn(() => Promise.resolve(mockNotes.filter(note => note.isPublic))),
  },
}));

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

  it('오늘의 차 카드와 공개 노트를 렌더링한다', () => {
    renderWithRouter(<Home />, { route: '/' });

    expect(screen.getByText('오늘의 차')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: '화과향' })).toHaveLength(2);

    expect(screen.getByText('공개 노트')).toBeInTheDocument();
    expect(screen.getByText('공개 노트입니다.')).toBeInTheDocument();
    expect(screen.queryByText('비공개 노트입니다.')).not.toBeInTheDocument();
  });
});

