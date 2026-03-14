import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserProfile } from '../UserProfile';
import { MemoryRouter } from 'react-router-dom';
import { usersApi, notesApi } from '../../lib/api';
import { User, Note, UserOnboardingPreference } from '../../types';

const mockNavigate = vi.fn();
const mockUseParams = vi.fn(() => ({ id: '2' }));
const mockUseAuth = vi.fn(() => ({
  user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
  isAuthenticated: true,
}));

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    usersApi: {
      getLevel: vi.fn(() => Promise.resolve(null)),
      getById: vi.fn(),
      getOnboardingPreference: vi.fn(),
    },
    notesApi: {
      getAll: vi.fn(),
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
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../components/ui/UserAvatar', () => ({
  UserAvatar: ({ name, profileImageUrl }: { name: string; profileImageUrl?: string | null }) => (
    <div data-slot="avatar" data-testid="user-avatar">
      {profileImageUrl ? (
        <img src={profileImageUrl} alt={name} />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  ),
}));

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
    schemaId: 1,
    overallRating: 4.5,
    isRatingIncluded: true,
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
    schemaId: 1,
    overallRating: 3.5,
    isRatingIncluded: true,
    memo: '테스트 메모 2',
    images: null,
    tags: ['허브향'],
    isPublic: false,
    createdAt: new Date('2024-01-02'),
  },
];

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: '2' });
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
      isAuthenticated: true,
    });
    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);
    vi.mocked(notesApi.getAll).mockResolvedValue(mockNotes);
    vi.mocked(usersApi.getOnboardingPreference).mockRejectedValue({ statusCode: 404 });
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

    // 스켈레톤 UI가 표시됨 (animate-pulse 요소)
    expect(screen.getByText('사용자 프로필')).toBeInTheDocument();
  });

  it('사용자를 불러오는데 실패하면 에러 메시지를 표시해야 함', async () => {
    vi.mocked(usersApi.getById).mockRejectedValue({ statusCode: 500, message: '서버 오류' });
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // API 실패 시 EmptyState에 "사용자를 찾을 수 없어요." 표시
      expect(screen.getByText('사용자를 찾을 수 없어요.')).toBeInTheDocument();
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
      expect(screen.getByText(/아직 작성한 차록이 없어요/)).toBeInTheDocument();
    });
  });

  it('내 프로필일 때 프로필 사진 수정 버튼을 표시해야 함', async () => {
    mockUseParams.mockReturnValue({ id: '1' }); // 현재 사용자 ID와 동일
    
    const mockUserWithProfile: User = {
      ...mockUser,
      id: 1, // 현재 사용자 ID와 동일
      profileImageUrl: 'https://example.com/profile.jpg',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUserWithProfile);
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const editButton = screen.getByLabelText('프로필 사진 수정');
      expect(editButton).toBeInTheDocument();
    });
  });

  it('다른 사용자 프로필일 때 프로필 사진 수정 버튼을 표시하지 않아야 함', async () => {
    const mockUserWithProfile: User = {
      ...mockUser,
      id: 2, // 현재 사용자 ID와 다름
      profileImageUrl: 'https://example.com/profile.jpg',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUserWithProfile);
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('프로필 사진 수정')).not.toBeInTheDocument();
    });
  });

  it('프로필 사진 URL이 있을 때 UserAvatar에 전달해야 함', async () => {
    const mockUserWithProfile: User = {
      ...mockUser,
      profileImageUrl: 'https://example.com/profile.jpg',
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUserWithProfile);
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // UserAvatar 컴포넌트가 렌더링되어야 함
      const avatar = screen.getByTestId('user-avatar');
      expect(avatar).toBeInTheDocument();
    });

    // 프로필 이미지가 있는 경우 이미지 요소가 렌더링되어야 함
    await waitFor(() => {
      const image = screen.getByAltText('프로필 사용자');
      expect(image).toHaveAttribute('src', 'https://example.com/profile.jpg');
    });
  });

  it('내 프로필일 때 모든 노트를 조회해야 함', async () => {
    mockUseParams.mockReturnValue({ id: '1' }); // 현재 사용자 ID와 동일
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
      isAuthenticated: true,
    });
    
    const mockUserOwn: User = {
      ...mockUser,
      id: 1, // 현재 사용자 ID와 동일
    };

    vi.mocked(usersApi.getById).mockResolvedValue(mockUserOwn);
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // 내 프로필이면 undefined (모든 노트 조회), 기본 정렬은 'latest', 페이지네이션 포함
      expect(notesApi.getAll).toHaveBeenCalledWith(1, undefined, undefined, undefined, undefined, 'latest', 1, 20);
    }, { timeout: 3000 });
  });

  it('다른 사용자 프로필일 때 공개 노트만 조회해야 함', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
      isAuthenticated: true,
    });
    vi.mocked(usersApi.getById).mockResolvedValue(mockUser);
    
    render(
      <MemoryRouter>
        <UserProfile />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // 다른 사용자면 true (공개 노트만 조회), 기본 정렬은 'latest', 페이지네이션 포함
      expect(notesApi.getAll).toHaveBeenCalledWith(2, true, undefined, undefined, undefined, 'latest', 1, 20);
    }, { timeout: 3000 });
  });

  describe('온보딩 취향 태그', () => {
    const mockOnboardingPreference: UserOnboardingPreference = {
      preferredTeaTypes: ['녹차', '홍차', '청차/우롱차'],
      preferredFlavorTags: ['꽃향', '과일향'],
      hasCompletedOnboarding: true,
    };

    it('내 프로필일 때 관심 차종 태그를 표시해야 함', async () => {
      mockUseParams.mockReturnValue({ id: '1' });
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
        isAuthenticated: true,
      });
      vi.mocked(usersApi.getById).mockResolvedValue({ ...mockUser, id: 1 });
      vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue(mockOnboardingPreference);

      render(
        <MemoryRouter>
          <UserProfile />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('관심 차종')).toBeInTheDocument();
        expect(screen.getByText('녹차')).toBeInTheDocument();
        expect(screen.getByText('홍차')).toBeInTheDocument();
        expect(screen.getByText('청차/우롱차')).toBeInTheDocument();
      });
    });

    it('내 프로필일 때 향미 태그를 표시해야 함', async () => {
      mockUseParams.mockReturnValue({ id: '1' });
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
        isAuthenticated: true,
      });
      vi.mocked(usersApi.getById).mockResolvedValue({ ...mockUser, id: 1 });
      vi.mocked(usersApi.getOnboardingPreference).mockResolvedValue(mockOnboardingPreference);

      render(
        <MemoryRouter>
          <UserProfile />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByText('향미')).toBeInTheDocument();
        expect(screen.getByText('꽃향')).toBeInTheDocument();
        expect(screen.getByText('과일향')).toBeInTheDocument();
      });
    });

    it('타인 프로필일 때 취향 정보를 표시하지 않아야 함', async () => {
      vi.mocked(usersApi.getById).mockResolvedValue(mockUser);

      render(
        <MemoryRouter>
          <UserProfile />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '프로필 사용자' })).toBeInTheDocument();
      });

      expect(screen.queryByText('관심 차종')).not.toBeInTheDocument();
      expect(screen.queryByText('향미')).not.toBeInTheDocument();
      expect(usersApi.getOnboardingPreference).not.toHaveBeenCalled();
    });

    it('온보딩 미완료 유저(404)의 경우 취향 섹션을 표시하지 않아야 함', async () => {
      mockUseParams.mockReturnValue({ id: '1' });
      mockUseAuth.mockReturnValue({
        user: { id: 1, name: '현재 사용자', email: 'current@example.com' },
        isAuthenticated: true,
      });
      vi.mocked(usersApi.getById).mockResolvedValue({ ...mockUser, id: 1 });
      vi.mocked(usersApi.getOnboardingPreference).mockRejectedValue({ statusCode: 404 });

      render(
        <MemoryRouter>
          <UserProfile />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: '프로필 사용자' })).toBeInTheDocument();
      });

      expect(screen.queryByText('관심 차종')).not.toBeInTheDocument();
      expect(screen.queryByText('향미')).not.toBeInTheDocument();
    });
  });
});

