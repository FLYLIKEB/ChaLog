import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TeaDetail } from '../TeaDetail';
import { MemoryRouter } from 'react-router-dom';
import { teasApi, notesApi } from '../../lib/api';
import { Tea, Note, PopularTag } from '../../types';

const mockNavigate = vi.fn();

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    teasApi: {
      getById: vi.fn(),
      getPopularTags: vi.fn(),
      getTopReviews: vi.fn(),
      getSimilarTeas: vi.fn(),
    },
    notesApi: {
      getAll: vi.fn(),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
  };
});

const mockTea: Tea = {
  id: 1,
  name: '정산소종',
  type: '홍차',
  year: 2023,
  seller: '차향',
  origin: '중국 푸젠',
  averageRating: 4.2,
  reviewCount: 8,
};

const mockNote = (id: number, likeCount = 0): Note => ({
  id,
  teaId: 1,
  teaName: '정산소종',
  userId: id,
  userName: `사용자 ${id}`,
  schemaId: 1,
  overallRating: 4.0,
  isRatingIncluded: true,
  memo: `테스트 메모 ${id}`,
  isPublic: true,
  createdAt: new Date(),
  likeCount,
});

const mockPopularTags: PopularTag[] = [
  { name: '꽃향', count: 5 },
  { name: '단맛', count: 3 },
  { name: '스모키', count: 1 },
];

const mockTopReviews: Note[] = [
  mockNote(1, 5),
  mockNote(2, 3),
  mockNote(3, 1),
];

const mockSimilarTeas: Tea[] = [
  { id: 2, name: '다즐링', type: '홍차', averageRating: 4.0, reviewCount: 3 },
  { id: 3, name: '아삼', type: '홍차', averageRating: 3.8, reviewCount: 2 },
];

function setupMocks() {
  vi.mocked(teasApi.getById).mockResolvedValue(mockTea);
  vi.mocked(notesApi.getAll).mockResolvedValue([]);
  vi.mocked(teasApi.getPopularTags).mockResolvedValue({ tags: mockPopularTags });
  vi.mocked(teasApi.getTopReviews).mockResolvedValue(mockTopReviews);
  vi.mocked(teasApi.getSimilarTeas).mockResolvedValue(mockSimilarTeas);
}

describe('TeaDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('로딩 중에 스피너를 표시해야 한다', () => {
    vi.mocked(teasApi.getById).mockReturnValue(new Promise(() => {}));
    vi.mocked(notesApi.getAll).mockReturnValue(new Promise(() => {}));
    vi.mocked(teasApi.getPopularTags).mockReturnValue(new Promise(() => {}));
    vi.mocked(teasApi.getTopReviews).mockReturnValue(new Promise(() => {}));
    vi.mocked(teasApi.getSimilarTeas).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('차 기본 정보를 표시해야 한다', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('정산소종')).toBeInTheDocument();
      expect(screen.getAllByText('홍차').length).toBeGreaterThan(0);
      expect(screen.getByText('2023년')).toBeInTheDocument();
    });
  });

  it('평균 평점을 표시해야 한다', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('4.2')).toBeInTheDocument();
      expect(screen.getByText('8개 리뷰 기반')).toBeInTheDocument();
    });
  });

  it('태그 클라우드를 표시해야 한다', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('tag-cloud')).toBeInTheDocument();
      expect(screen.getByText(/꽃향/)).toBeInTheDocument();
      expect(screen.getByText(/단맛/)).toBeInTheDocument();
      expect(screen.getByText(/스모키/)).toBeInTheDocument();
    });
  });

  it('대표 리뷰 섹션 제목을 표시해야 한다', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('대표 리뷰')).toBeInTheDocument();
    });
  });

  it('유사 차 섹션을 표시해야 한다', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('similar-teas')).toBeInTheDocument();
      expect(screen.getByText('다즐링')).toBeInTheDocument();
      expect(screen.getByText('아삼')).toBeInTheDocument();
    });
  });

  it('태그가 없을 때 태그 클라우드 섹션을 숨겨야 한다', async () => {
    vi.mocked(teasApi.getById).mockResolvedValue(mockTea);
    vi.mocked(notesApi.getAll).mockResolvedValue([]);
    vi.mocked(teasApi.getPopularTags).mockResolvedValue({ tags: [] });
    vi.mocked(teasApi.getTopReviews).mockResolvedValue([]);
    vi.mocked(teasApi.getSimilarTeas).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('tag-cloud')).not.toBeInTheDocument();
    });
  });

  it('유사 차가 없을 때 유사 차 섹션을 숨겨야 한다', async () => {
    vi.mocked(teasApi.getById).mockResolvedValue(mockTea);
    vi.mocked(notesApi.getAll).mockResolvedValue([]);
    vi.mocked(teasApi.getPopularTags).mockResolvedValue({ tags: mockPopularTags });
    vi.mocked(teasApi.getTopReviews).mockResolvedValue([]);
    vi.mocked(teasApi.getSimilarTeas).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId('similar-teas')).not.toBeInTheDocument();
    });
  });

  it('리뷰 수가 부족할 때 경고 메시지를 표시해야 한다', async () => {
    const lowReviewTea = { ...mockTea, reviewCount: 1, averageRating: 0 };
    vi.mocked(teasApi.getById).mockResolvedValue(lowReviewTea);
    vi.mocked(notesApi.getAll).mockResolvedValue([]);
    vi.mocked(teasApi.getPopularTags).mockResolvedValue({ tags: [] });
    vi.mocked(teasApi.getTopReviews).mockResolvedValue([]);
    vi.mocked(teasApi.getSimilarTeas).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('평가 데이터가 부족합니다. 더 많은 리뷰가 필요해요.')).toBeInTheDocument();
    });
  });

  it('핵심 API(getById) 실패 시 에러 메시지를 표시해야 한다', async () => {
    vi.mocked(teasApi.getById).mockRejectedValue(new Error('Not found'));
    vi.mocked(notesApi.getAll).mockRejectedValue(new Error('Not found'));
    vi.mocked(teasApi.getPopularTags).mockResolvedValue({ tags: [] });
    vi.mocked(teasApi.getTopReviews).mockResolvedValue([]);
    vi.mocked(teasApi.getSimilarTeas).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('차 정보를 찾을 수 없습니다.')).toBeInTheDocument();
    });
  });

  it('부가 API 실패 시에도 차 기본 정보와 평점을 표시해야 한다', async () => {
    vi.mocked(teasApi.getById).mockResolvedValue(mockTea);
    vi.mocked(notesApi.getAll).mockResolvedValue([]);
    vi.mocked(teasApi.getPopularTags).mockRejectedValue(new Error('tags failed'));
    vi.mocked(teasApi.getTopReviews).mockRejectedValue(new Error('reviews failed'));
    vi.mocked(teasApi.getSimilarTeas).mockRejectedValue(new Error('similar failed'));

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('정산소종')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument();
      expect(screen.queryByTestId('tag-cloud')).not.toBeInTheDocument();
      expect(screen.queryByTestId('similar-teas')).not.toBeInTheDocument();
    });
  });

  it('"이 차로 노트 작성하기" 버튼이 있어야 한다', async () => {
    setupMocks();

    render(
      <MemoryRouter>
        <TeaDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '이 차로 노트 작성하기' })).toBeInTheDocument();
    });
  });
});
