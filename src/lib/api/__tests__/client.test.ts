import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';

// apiClient는 모듈 레벨에서 생성되므로 fetch mock 이후 동적 import 필요
let apiClient: typeof import('../client').apiClient;

function mockResponse(status: number, body: unknown = {}, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// 401 테스트에서 비동기 에러 전파로 인한 unhandled rejection 방지
const suppressUnhandled = (event: Event) => {
  if (event instanceof PromiseRejectionEvent) event.preventDefault();
};
const suppressProcess = (reason: unknown) => {
  if (reason && typeof reason === 'object' && 'statusCode' in reason && (reason as { statusCode: number }).statusCode === 401) {
    // suppress expected 401 rejections from concurrent retry chains
  }
};

describe('ApiClient', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    window.addEventListener('unhandledrejection', suppressUnhandled);
    process.on('unhandledRejection', suppressProcess);
  });

  afterAll(() => {
    window.removeEventListener('unhandledrejection', suppressUnhandled);
    process.off('unhandledRejection', suppressProcess);
  });

  beforeEach(async () => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    const mod = await import('../client');
    apiClient = mod.apiClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('credentials', () => {
    it('모든 요청에 credentials: include를 포함해야 한다', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { data: 'test' }));

      await apiClient.get('/teas');

      expect(fetchSpy).toHaveBeenCalledOnce();
      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[1]).toMatchObject({ credentials: 'include' });
    });

    it('Authorization 헤더를 포함하지 않아야 한다 (쿠키 기반 인증)', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, []));

      await apiClient.get('/notes');

      const callArgs = fetchSpy.mock.calls[0];
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers).not.toHaveProperty('Authorization');
    });
  });

  describe('401 auto-refresh', () => {
    it('401 응답 시 토큰 갱신 후 재시도해야 한다', async () => {
      // 1st call: 401
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Unauthorized' }));
      // 2nd call: refresh success
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { message: '토큰이 갱신되었습니다.' }));
      // 3rd call: original request retry success
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 1, name: 'test' }));

      const result = await apiClient.get<{ id: number; name: string }>('/teas/1');

      expect(result).toEqual({ id: 1, name: 'test' });
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      // refresh 호출 확인
      const refreshCall = fetchSpy.mock.calls[1];
      expect(refreshCall[0]).toContain('/auth/refresh');
      expect(refreshCall[1]?.method).toBe('POST');
    });

    it('토큰 갱신 실패 시 auth:logout 이벤트를 발생시켜야 한다', async () => {
      const logoutHandler = vi.fn((e: Event) => e.stopImmediatePropagation());
      window.addEventListener('auth:logout', logoutHandler);

      // 1st call: 401
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Unauthorized' }));
      // 2nd call: refresh fails
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Refresh failed' }));
      // fallback for any subsequent calls triggered by logout
      fetchSpy.mockResolvedValue(mockResponse(200, {}));

      await expect(apiClient.get('/teas')).rejects.toMatchObject({ statusCode: 401 });
      expect(logoutHandler).toHaveBeenCalledOnce();

      window.removeEventListener('auth:logout', logoutHandler);
    });

    it('앱 시작 시 /auth/me가 401이면 토큰 갱신 후 다시 시도해야 한다', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Unauthorized' }));
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { message: '토큰이 갱신되었습니다.' }));
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { user: { id: 1, email: 'user@example.com', name: 'User' } }));

      const result = await apiClient.get<{ user: { id: number; email: string; name: string } }>('/auth/me');

      expect(result).toEqual({ user: { id: 1, email: 'user@example.com', name: 'User' } });
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.mock.calls[1][0]).toContain('/auth/refresh');
      expect(fetchSpy.mock.calls[2][0]).toContain('/auth/me');
    });

    it('쿼리나 trailing slash가 붙은 /auth/me도 토큰 갱신 후 다시 시도해야 한다', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Unauthorized' }));
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { message: '토큰이 갱신되었습니다.' }));
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { user: { id: 1, email: 'user@example.com', name: 'User' } }));

      const result = await apiClient.get<{ user: { id: number; email: string; name: string } }>('/auth/me/?source=boot');

      expect(result).toEqual({ user: { id: 1, email: 'user@example.com', name: 'User' } });
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.mock.calls[1][0]).toContain('/auth/refresh');
      expect(fetchSpy.mock.calls[2][0]).toContain('/auth/me/?source=boot');
    });

    it('동시 401 요청 시 토큰 갱신은 1회만 수행해야 한다', async () => {
      // Suppress auth:logout from reaching other listeners
      const suppressLogout = (e: Event) => e.stopImmediatePropagation();
      window.addEventListener('auth:logout', suppressLogout);

      // 모든 초기 요청: 401
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Unauthorized' }));
      fetchSpy.mockResolvedValueOnce(mockResponse(401, { message: 'Unauthorized' }));
      // refresh: 1회만 (coalesced)
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { message: 'refreshed' }));
      // retries
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 1 }));
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { id: 2 }));
      // fallback
      fetchSpy.mockResolvedValue(mockResponse(200, {}));

      const [r1, r2] = await Promise.all([
        apiClient.get<{ id: number }>('/teas/1'),
        apiClient.get<{ id: number }>('/teas/2'),
      ]);

      expect(r1).toEqual({ id: 1 });
      expect(r2).toEqual({ id: 2 });
      // refresh 호출은 최대 1회
      const refreshCalls = fetchSpy.mock.calls.filter(
        (c: [string, RequestInit]) => (c[0] as string).includes('/auth/refresh')
      );
      expect(refreshCalls.length).toBe(1);

      window.removeEventListener('auth:logout', suppressLogout);
    });
  });

  describe('POST requests', () => {
    it('POST 요청에도 credentials: include를 포함해야 한다', async () => {
      fetchSpy.mockResolvedValueOnce(mockResponse(200, { success: true }));

      await apiClient.post('/notes', { memo: 'test' });

      const callArgs = fetchSpy.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        credentials: 'include',
        method: 'POST',
      });
    });
  });
});
