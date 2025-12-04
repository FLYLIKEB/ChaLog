import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient } from '../api';

// fetch mock
global.fetch = vi.fn();

describe('ApiClient - uploadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('정상적인 업로드', () => {
    it('이미지 파일을 업로드해야 함', async () => {
      const mockFile = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const mockResponse = { url: 'https://example.com/image.jpg' };
      const mockToken = 'test-token';

      localStorage.setItem('access_token', mockToken);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response);

      const result = await apiClient.uploadFile<{ url: string }>('/notes/images', mockFile);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notes/images'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockToken}`,
          }),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it('FormData에 파일이 포함되어야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
      const mockToken = 'test-token';

      localStorage.setItem('access_token', mockToken);

      vi.mocked(fetch).mockImplementationOnce(async (url, options) => {
        const formData = (options as RequestInit).body as FormData;
        expect(formData).toBeInstanceOf(FormData);
        expect(formData.get('image')).toBe(mockFile);

        return {
          ok: true,
          json: async () => ({ url: 'https://example.com/image.jpg' }),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response;
      });

      await apiClient.uploadFile('/notes/images', mockFile);
    });
  });

  describe('예외 케이스 - 인증', () => {
    it('토큰이 없으면 401 에러를 던져야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: '로그인이 필요합니다.',
        statusCode: 401,
      });

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('예외 케이스 - 서버 에러', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token');
    });

    it('400 에러를 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: '잘못된 요청입니다.' }),
      } as Response);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: '잘못된 요청입니다.',
        statusCode: 400,
      });
    });

    it('401 에러를 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Unauthorized' }),
      } as Response);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: expect.stringContaining('로그인이 필요합니다'),
        statusCode: 401,
      });
    });

    it('500 에러를 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: '서버 오류가 발생했습니다.' }),
      } as Response);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: '서버 오류가 발생했습니다.',
        statusCode: 500,
      });
    });

    it('JSON이 아닌 에러 응답을 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Server Error',
      } as Response);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  describe('예외 케이스 - 네트워크', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token');
    });

    it('네트워크 에러를 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toThrow('Network error');
    });

    it('타임아웃 에러를 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      // AbortError를 직접 던져서 타임아웃 시뮬레이션
      const abortError = new Error('The operation was aborted.');
      abortError.name = 'AbortError';
      vi.mocked(fetch).mockRejectedValueOnce(abortError);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: '요청 시간이 초과되었습니다.',
        statusCode: 408,
      });
    });
  });

  describe('에러 메시지 처리', () => {
    beforeEach(() => {
      localStorage.setItem('access_token', 'test-token');
    });

    it('에러 메시지 배열을 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: ['첫 번째 에러', '두 번째 에러'] }),
      } as Response);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: '첫 번째 에러',
        statusCode: 400,
      });
    });

    it('에러 객체의 error 필드를 처리해야 함', async () => {
      const mockFile = new File(['image'], 'test.jpg', { type: 'image/jpeg' });

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: '에러 메시지' }),
      } as Response);

      await expect(
        apiClient.uploadFile('/notes/images', mockFile),
      ).rejects.toMatchObject({
        message: '에러 메시지',
        statusCode: 400,
      });
    });
  });
});

