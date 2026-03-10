import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi, describe, it, expect } from 'vitest';
import { PostImageUploader } from '../PostImageUploader';
import { PostImageItem } from '../../types';
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
      isAdmin: false,
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

  it('파일 업로드 시 postsApi.uploadImage를 호출한다', async () => {
    vi.mocked(postsApi.uploadImage).mockResolvedValue({
      url: 'https://example.com/uploaded.jpg',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    });
    renderWithRouter(
      <PostImageUploader images={[]} onChange={onChange} maxImages={5} />,
    );
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => {
      expect(postsApi.uploadImage).toHaveBeenCalledWith(file);
    });
  });

  it('caption 입력 시 onChange를 호출한다', async () => {
    const user = userEvent.setup();
    const initialImages: PostImageItem[] = [{ url: 'https://example.com/1.jpg', caption: '' }];
    const Wrapper = () => {
      const [imgs, setImgs] = React.useState<PostImageItem[]>(initialImages);
      return (
        <PostImageUploader
          images={imgs}
          onChange={(next) => {
            setImgs(next);
            onChange(next);
          }}
          maxImages={5}
        />
      );
    };
    renderWithRouter(<Wrapper />);
    const captionInput = screen.getByPlaceholderText('이미지 설명 (선택)');
    await user.type(captionInput, 'test');
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall[0]).toMatchObject({ url: 'https://example.com/1.jpg', caption: 'test' });
  });

  it('최대 이미지 개수(5장)에 도달하면 업로드 버튼을 숨긴다', () => {
    const images = Array.from({ length: 5 }, (_, i) => ({
      url: `https://example.com/${i}.jpg`,
    }));
    renderWithRouter(
      <PostImageUploader images={images} onChange={onChange} maxImages={5} />,
    );
    expect(screen.queryByText(/사진 추가/)).not.toBeInTheDocument();
  });
});
