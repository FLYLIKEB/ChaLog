import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserProfile } from '../UserProfile';
import { MemoryRouter } from 'react-router-dom';
import { usersApi, notesApi } from '../../lib/api';
import { User, Note } from '../../types';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    usersApi: {
      getById: vi.fn(),
    },
    notesApi: {
      getAll: vi.fn(),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
    isAuthenticated: true,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '2' }),
    useNavigate: () => vi.fn(),
  };
});

const mockUser: User = {
  id: 2,
  name: '프로필 사용자',
  email: 'profile@example.com',
};

const mockNotes: Note[] = [
  {
    id: 1,
    teaId: 1,
    teaName: '테스트 차 1',
    userId: 2,
    userName: '프로필 사용자',
    rating: 4.5,
    ratings: {
      richness: 4,
      strength: 3,
      smoothness: 4,
      clarity: 5,
      complexity: 4,
    },
    memo: '테스트 메모 1',
    images: ['https://example.com/image1.jpg'],
    tags: ['풀향'],
    isPublic: true,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    teaId: 2,
    teaName: '테스트 차 2',
    userId: 2,
    userName: '프로필 사용자',
    rating: 3.5,
    ratings: {
      richness: 3,
      strength: 4,
      smoothness: 3,
      clarity: 3,
      complexity: 4,
    },
    memo: '테스트 메모 2',
    images: null,
    tags: ['허브향'],
    isPublic: false,
    createdAt: new Date('2024-01-02'),
  },
];

describe('UserProfile', () => {
  beforeEach(() => {
    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);
    vi.mocked(notesApi.getAll).mockResolvedValue(mockNotes);
  });

  it('사용자 프로필 정보를 표시해야 함', async () => {
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const heading = screen.getByRole('heading', { name: '프로필 사용자' });
      expect(heading).toBeInTheDocument();
    });
  });

  it('사용자 프로필 사진(아바타)을 표시해야 함', async () => {
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const avatar = screen.getByText('프').closest('[data-slot="avatar"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  it('작성한 노트 수를 표시해야 함', async () => {
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/총 \d+개/)).toBeInTheDocument();
    });
  });

  it('작성한 노트 목록을 표시해야 함', async () => {
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('테스트 차 1')).toBeInTheDocument();
      expect(screen.getByText('테스트 차 2')).toBeInTheDocument();
    });
  });

  it('로딩 중일 때 로딩 표시를 보여야 함', () => {
    vi.mocked(usersApi.getById).mockImplementation(() => new Promise(() => {}));
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('사용자를 불러오는데 실패하면 에러 메시지를 표시해야 함', async () => {
    vi.mocked(usersApi.getById).mockRejectedValue({ statusCode: 500, message: '서버 오류' });
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // toast는 화면에 직접 표시되지 않으므로, 에러 상태를 확인
      expect(screen.getByText('사용자를 찾을 수 없습니다.')).toBeInTheDocument();
    });
  });

  it('노트가 없을 때 빈 상태 메시지를 표시해야 함', async () => {
    vi.mocked(notesApi.getAll).mockResolvedValue([]);
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/아직 작성한 노트가 없습니다/)).toBeInTheDocument();
    });
  });
});

