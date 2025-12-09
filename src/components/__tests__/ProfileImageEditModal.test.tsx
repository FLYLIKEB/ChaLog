import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ProfileImageEditModal } from '../ProfileImageEditModal';
import { usersApi } from '../../lib/api';

// URL.createObjectURL mock
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test');
global.URL.revokeObjectURL = vi.fn();

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    usersApi: {
      uploadProfileImage: vi.fn(),
      updateProfile: vi.fn(),
    },
  };
});

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProfileImageEditModal', () => {
  const mockOnSuccess = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('모달이 열렸을 때 제목과 설명을 표시해야 함', () => {
    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl={null}
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    expect(screen.getByText('프로필 사진 수정')).toBeInTheDocument();
    expect(screen.getByText(/프로필 사진을 업로드하거나 제거할 수 있습니다/)).toBeInTheDocument();
  });

  it('모달이 닫혔을 때 내용을 표시하지 않아야 함', () => {
    render(
      <ProfileImageEditModal
        open={false}
        onOpenChange={mockOnOpenChange}
        currentImageUrl={null}
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    expect(screen.queryByText('프로필 사진 수정')).not.toBeInTheDocument();
  });

  it('현재 프로필 사진이 있을 때 미리보기를 표시해야 함', () => {
    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl="https://example.com/profile.jpg"
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    const image = screen.getByAltText('프로필 사진 미리보기');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/profile.jpg');
  });

  it('프로필 사진 업로드 성공 시 onSuccess 콜백 호출', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    
    vi.mocked(usersApi.uploadProfileImage).mockResolvedValue({ url: 'https://example.com/new-profile.jpg' });
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      profileImageUrl: 'https://example.com/new-profile.jpg',
    });

    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl={null}
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    // 숨겨진 파일 입력 찾기
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(usersApi.uploadProfileImage).toHaveBeenCalled();
      expect(usersApi.updateProfile).toHaveBeenCalledWith(1, {
        profileImageUrl: 'https://example.com/new-profile.jpg',
      });
      expect(mockOnSuccess).toHaveBeenCalledWith('https://example.com/new-profile.jpg');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('현재 프로필 사진이 있을 때 제거 버튼을 표시해야 함', () => {
    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl="https://example.com/profile.jpg"
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    expect(screen.getByText('사진 제거')).toBeInTheDocument();
  });

  it('현재 프로필 사진이 없을 때 제거 버튼을 표시하지 않아야 함', () => {
    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl={null}
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    expect(screen.queryByText('사진 제거')).not.toBeInTheDocument();
  });

  it('프로필 사진 제거 성공 시 onSuccess 콜백 호출', async () => {
    const user = userEvent.setup();
    
    vi.mocked(usersApi.updateProfile).mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      profileImageUrl: null,
    });

    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl="https://example.com/profile.jpg"
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    const removeButton = screen.getByText('사진 제거');
    await user.click(removeButton);

    await waitFor(() => {
      expect(usersApi.updateProfile).toHaveBeenCalledWith(1, {
        profileImageUrl: null,
      });
      expect(mockOnSuccess).toHaveBeenCalledWith('');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('업로드 중일 때 버튼이 비활성화되어야 함', async () => {
    const user = userEvent.setup();
    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    
    // 업로드가 완료되지 않도록 Promise를 pending 상태로 유지
    vi.mocked(usersApi.uploadProfileImage).mockImplementation(
      () => new Promise(() => {}) // resolve되지 않는 Promise
    );

    render(
      <ProfileImageEditModal
        open={true}
        onOpenChange={mockOnOpenChange}
        currentImageUrl={null}
        onSuccess={mockOnSuccess}
        userId={1}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByText('업로드 중...')).toBeInTheDocument();
      expect(fileInput).toBeDisabled();
    });
  });
});

