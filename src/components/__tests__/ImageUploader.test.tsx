import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImageUploader } from '../ImageUploader';
import { notesApi } from '../../lib/api';
import { toast } from 'sonner';
import { logger } from '../../lib/logger';

vi.mock('../../lib/api', () => ({
  notesApi: {
    uploadImage: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: 1, name: '테스트 사용자', email: 'test@example.com' },
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockOnChange = vi.fn();

describe('ImageUploader 컴포넌트', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnChange.mockClear();
    mockNavigate.mockClear();
  });

  describe('정상적인 이미지 업로드', () => {
    it('이미지 파일을 선택하면 업로드해야 함', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = { url: 'https://example.com/image.jpg' };

      vi.mocked(notesApi.uploadImage).mockResolvedValue(mockResponse);

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(notesApi.uploadImage).toHaveBeenCalledWith(mockFile);
        expect(mockOnChange).toHaveBeenCalledWith([mockResponse.url]);
        expect(toast.success).toHaveBeenCalledWith('1장의 이미지가 업로드되었습니다.');
      });
    });

    it('여러 이미지를 동시에 업로드할 수 있어야 함', async () => {
      const user = userEvent.setup();
      const mockFiles = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];
      const mockResponses = [
        { url: 'https://example.com/image1.jpg' },
        { url: 'https://example.com/image2.jpg' },
      ];

      vi.mocked(notesApi.uploadImage)
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1]);

      render(<ImageUploader images={[]} onChange={mockOnChange} maxImages={5} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(notesApi.uploadImage).toHaveBeenCalledTimes(2);
        expect(mockOnChange).toHaveBeenCalledWith([
          mockResponses[0].url,
          mockResponses[1].url,
        ]);
        expect(toast.success).toHaveBeenCalledWith('2장의 이미지가 업로드되었습니다.');
      });
    });

    it('업로드 중에는 버튼이 비활성화되어야 함', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      
      // 업로드를 완료하지 않도록 Promise를 보류
      let resolveUpload: (value: { url: string }) => void;
      const uploadPromise = new Promise<{ url: string }>((resolve) => {
        resolveUpload = resolve;
      });
      vi.mocked(notesApi.uploadImage).mockReturnValue(uploadPromise);

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/업로드 중/i)).toBeInTheDocument();
      });

      const uploadButton = screen.getByText(/업로드 중/i).closest('button');
      expect(uploadButton).toBeDisabled();

      // 업로드 완료
      resolveUpload!({ url: 'https://example.com/image.jpg' });
      await waitFor(() => {
        expect(screen.queryByText(/업로드 중/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('예외 케이스 - 파일 검증', () => {
    it('이미지가 아닌 파일을 업로드하면 에러를 표시해야 함', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      
      // change 이벤트 직접 트리거
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      
      const changeEvent = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('이미지 파일만 업로드할 수 있습니다.');
        expect(notesApi.uploadImage).not.toHaveBeenCalled();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('10MB를 초과하는 파일을 업로드하면 에러를 표시해야 함', async () => {
      const user = userEvent.setup();
      // 11MB 파일 생성
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, largeFile);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('파일 크기는 10MB를 초과할 수 없습니다.');
        expect(notesApi.uploadImage).not.toHaveBeenCalled();
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('최대 이미지 개수를 초과하면 에러를 표시해야 함', async () => {
      const user = userEvent.setup();
      const existingImages = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg',
        'https://example.com/image5.jpg',
      ];
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      render(<ImageUploader images={existingImages} onChange={mockOnChange} maxImages={5} />);

      // 최대 개수에 도달하면 파일 입력이 없어야 함
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).not.toBeInTheDocument();
    });

    it('이미지가 최대 개수에 도달하면 업로드 버튼이 숨겨져야 함', () => {
      const existingImages = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg',
        'https://example.com/image5.jpg',
      ];

      render(<ImageUploader images={existingImages} onChange={mockOnChange} maxImages={5} />);

      expect(screen.queryByText(/사진 추가/i)).not.toBeInTheDocument();
    });
  });

  describe('예외 케이스 - 인증', () => {
    it('로그인하지 않은 사용자가 업로드하면 로그인 페이지로 이동해야 함', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      // 인증되지 않은 사용자로 mock
      const { useAuth } = await import('../../contexts/AuthContext');
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('로그인이 필요합니다.');
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(notesApi.uploadImage).not.toHaveBeenCalled();
      });
    });
  });

  describe('예외 케이스 - 네트워크 및 서버 에러', () => {
    it('네트워크 에러 발생 시 에러 메시지를 표시해야 함', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const networkError = new Error('Network error');

      vi.mocked(notesApi.uploadImage).mockRejectedValue(networkError);

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalled();
        expect(mockOnChange).not.toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('401 에러 발생 시 로그인 페이지로 이동해야 함', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const authError = { statusCode: 401, message: 'Unauthorized' };

      vi.mocked(notesApi.uploadImage).mockRejectedValue(authError);

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('로그인이 필요합니다. 다시 로그인해주세요.');
        expect(mockNavigate).toHaveBeenCalledWith('/login');
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });

    it('일부 이미지 업로드 실패 시 부분 성공 메시지를 표시해야 함', async () => {
      const user = userEvent.setup();
      const mockFiles = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      vi.mocked(notesApi.uploadImage)
        .mockResolvedValueOnce({ url: 'https://example.com/image1.jpg' })
        .mockRejectedValueOnce(new Error('Upload failed'));

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('1장의 이미지가 업로드되었습니다.');
        expect(toast.error).toHaveBeenCalledWith('1장의 이미지 업로드에 실패했습니다.');
        expect(mockOnChange).toHaveBeenCalledWith(['https://example.com/image1.jpg']);
      });
    });

    it('모든 이미지 업로드 실패 시 에러 메시지를 표시해야 함', async () => {
      const user = userEvent.setup();
      const mockFiles = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.jpg', { type: 'image/jpeg' }),
      ];

      vi.mocked(notesApi.uploadImage)
        .mockRejectedValueOnce(new Error('Upload failed 1'))
        .mockRejectedValueOnce(new Error('Upload failed 2'));

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFiles);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('2장의 이미지 업로드에 실패했습니다.');
        expect(mockOnChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('이미지 삭제', () => {
    it('이미지 삭제 버튼을 클릭하면 이미지를 제거해야 함', async () => {
      const user = userEvent.setup();
      const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      render(<ImageUploader images={images} onChange={mockOnChange} />);

      const deleteButtons = screen.getAllByTitle('삭제');
      await user.click(deleteButtons[0]);

      expect(mockOnChange).toHaveBeenCalledWith([images[1]]);
    });

    it('같은 URL이 여러 개 있을 때 인덱스 기반으로 정확히 삭제해야 함', async () => {
      const user = userEvent.setup();
      const sameUrl = 'https://example.com/same-image.jpg';
      const images = [
        sameUrl,
        'https://example.com/image2.jpg',
        sameUrl, // 같은 URL이 두 번째로 다시 나타남
      ];

      render(<ImageUploader images={images} onChange={mockOnChange} />);

      const deleteButtons = screen.getAllByTitle('삭제');
      // 두 번째 이미지(다른 URL) 삭제
      await user.click(deleteButtons[1]);

      // 두 번째 이미지만 삭제되어야 함 (같은 URL이 있어도 첫 번째와 세 번째는 유지)
      expect(mockOnChange).toHaveBeenCalledWith([sameUrl, sameUrl]);
    });

    it('이미지가 없을 때 빈 상태 UI를 표시해야 함', () => {
      render(<ImageUploader images={[]} onChange={mockOnChange} maxImages={5} />);

      expect(screen.getByText(/사진을 추가해보세요/i)).toBeInTheDocument();
      expect(screen.getByText(/최대 5장까지 업로드 가능/i)).toBeInTheDocument();
    });
  });

  describe('이미지 미리보기', () => {
    it('업로드된 이미지를 미리보기로 표시해야 함', () => {
      const images = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];

      render(<ImageUploader images={images} onChange={mockOnChange} />);

      const imageElements = screen.getAllByAltText(/업로드된 이미지/);
      expect(imageElements).toHaveLength(2);
      expect(imageElements[0]).toHaveAttribute('src', images[0]);
      expect(imageElements[0]).toHaveAttribute('alt', '업로드된 이미지 1');
      expect(imageElements[1]).toHaveAttribute('src', images[1]);
      expect(imageElements[1]).toHaveAttribute('alt', '업로드된 이미지 2');
    });

    it('이미지 개수 표시가 정확해야 함', () => {
      const images = ['https://example.com/image1.jpg'];

      render(<ImageUploader images={images} onChange={mockOnChange} maxImages={5} />);

      expect(screen.getByText('1/5')).toBeInTheDocument();
    });
  });

  describe('파일 입력 초기화', () => {
    it('업로드 완료 후 파일 입력을 초기화해야 함', async () => {
      const user = userEvent.setup();
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = { url: 'https://example.com/image.jpg' };

      vi.mocked(notesApi.uploadImage).mockResolvedValue(mockResponse);

      render(<ImageUploader images={[]} onChange={mockOnChange} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });
    });
  });
});

