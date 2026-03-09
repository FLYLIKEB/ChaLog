import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { PostImageUploader } from '../PostImageUploader';
import { renderWithRouter } from '../../test/renderWithRouter';
import { useAuth } from '../../contexts/AuthContext';
import { postsApi } from '../../lib/api';

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../contexts/AuthContext')>('../../contexts/AuthContext');
  return { ...actual, useAuth: vi.fn() };
});

vi.mock('../../lib/api', () => ({
  postsApi: { uploadImage: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('PostImageUploader', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 1, name: '테스트', email: 'test@test.com' },
      isAuthenticated: true,
      isLoading: false,
      token: 'token',
      login: vi.fn(),
      register: vi.fn(),
      loginWithKakao: vi.fn(),
      loginWithGoogle: vi.fn(),
      logout: vi.fn(),
      hasCompletedOnboarding: true,
      isOnboardingLoading: false,
      refreshOnboardingStatus: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('빈 상태에서 업로드 안내를 표시한다', () => {
    renderWithRouter(
      <PostImageUploader images={[]} onChange={onChange} maxImages={5} />,
    );
    expect(screen.getByText('사진을 추가해보세요')).toBeInTheDocument();
    expect(screen.getByText(/최대 5장까지 업로드 가능/)).toBeInTheDocument();
  });

  it('이미지가 있으면 미리보기와 caption 입력 필드를 표시한다', () => {
    const images = [
      { url: 'https://example.com/1.jpg', caption: '설명 1' },
      { url: 'https://example.com/2.jpg' },
    ];
    renderWithRouter(
      <PostImageUploader images={images} onChange={onChange} maxImages={5} />,
    );
    expect(screen.getByAltText('업로드된 이미지 1')).toBeInTheDocument();
    expect(screen.getByAltText('업로드된 이미지 2')).toBeInTheDocument();
    const captionInputs = screen.getAllByPlaceholderText('이미지 설명 (선택)');
    expect(captionInputs).toHaveLength(2);
  });

  it('삭제 버튼 클릭 시 onChange를 호출한다', async () => {
    const user = userEvent.setup();
    const images = [{ url: 'https://example.com/1.jpg' }];
    renderWithRouter(
      <PostImageUploader images={images} onChange={onChange} maxImages={5} />,
    );
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
    await user.click(deleteButtons[0]);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
