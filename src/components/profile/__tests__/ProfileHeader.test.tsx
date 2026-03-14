import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfileHeader } from '../ProfileHeader';
import { User } from '@/types';

vi.mock('@/components/ui/UserAvatar', () => ({
  UserAvatar: ({ name }: { name: string; profileImageUrl?: string | null }) => (
    <div data-testid="user-avatar">{name.charAt(0).toUpperCase()}</div>
  ),
}));

const mockUser: User = {
  id: 1,
  name: '김차인',
  email: 'tea@example.com',
  bio: '차를 좋아합니다.',
  followerCount: 42,
  followingCount: 10,
  isFollowing: false,
};

function renderProfileHeader(overrides: Partial<Parameters<typeof ProfileHeader>[0]> = {}) {
  const props = {
    user: mockUser,
    isOwnProfile: false,
    isFollowLoading: false,
    onFollowToggle: vi.fn(),
    onEditImage: vi.fn(),
    onEditProfile: vi.fn(),
    ...overrides,
  };
  return render(
    <MemoryRouter>
      <ProfileHeader {...props} />
    </MemoryRouter>,
  );
}

describe('ProfileHeader', () => {
  it('사용자 이름을 표시한다', () => {
    renderProfileHeader();
    expect(screen.getByRole('heading', { name: '김차인' })).toBeInTheDocument();
  });

  it('bio를 표시한다', () => {
    renderProfileHeader();
    expect(screen.getByText('차를 좋아합니다.')).toBeInTheDocument();
  });

  it('구독자/구독 수를 표시한다', () => {
    renderProfileHeader();
    expect(screen.getByText('구독자 42')).toBeInTheDocument();
    expect(screen.getByText('구독 10')).toBeInTheDocument();
  });

  it('타인 프로필일 때 구독 버튼을 표시한다', () => {
    renderProfileHeader({ isOwnProfile: false });
    expect(screen.getByRole('button', { name: /구독/ })).toBeInTheDocument();
  });

  it('내 프로필일 때 구독 버튼을 표시하지 않는다', () => {
    renderProfileHeader({ isOwnProfile: true });
    expect(screen.queryByRole('button', { name: /^구독$/ })).not.toBeInTheDocument();
  });

  it('내 프로필일 때 프로필 사진 수정 버튼을 표시한다', () => {
    renderProfileHeader({ isOwnProfile: true });
    expect(screen.getByLabelText('프로필 사진 수정')).toBeInTheDocument();
  });

  it('타인 프로필일 때 프로필 사진 수정 버튼을 표시하지 않는다', () => {
    renderProfileHeader({ isOwnProfile: false });
    expect(screen.queryByLabelText('프로필 사진 수정')).not.toBeInTheDocument();
  });

  it('구독 버튼 클릭 시 onFollowToggle을 호출한다', async () => {
    const onFollowToggle = vi.fn();
    renderProfileHeader({ isOwnProfile: false, onFollowToggle });
    await userEvent.click(screen.getByRole('button', { name: /구독/ }));
    expect(onFollowToggle).toHaveBeenCalledOnce();
  });

  it('이미 구독 중이면 "구독 중" 텍스트를 표시한다', () => {
    renderProfileHeader({ user: { ...mockUser, isFollowing: true } });
    expect(screen.getByRole('button', { name: '구독 중' })).toBeInTheDocument();
  });

  it('인스타그램 링크를 표시한다', () => {
    renderProfileHeader({ user: { ...mockUser, instagramUrl: 'https://instagram.com/test' } });
    expect(screen.getByLabelText('인스타그램')).toHaveAttribute('href', 'https://instagram.com/test');
  });

  it('블로그 링크를 표시한다', () => {
    renderProfileHeader({ user: { ...mockUser, blogUrl: 'https://blog.example.com' } });
    expect(screen.getByLabelText('블로그')).toHaveAttribute('href', 'https://blog.example.com');
  });
});
