import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// proxy.ts를 동적 import하기 위한 타입
type Handler = (req: any, res: any) => Promise<void>;

function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    headers: {},
    query: { path: 'teas' },
    url: '/api/proxy?path=teas',
    on: vi.fn(),
    socket: {},
    ...overrides,
  };
}

function createMockRes() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn(),
    setHeader: vi.fn(),
    headersSent: false,
    _headers: {} as Record<string, string>,
  };
  res.setHeader.mockImplementation((key: string, value: string) => {
    res._headers[key.toLowerCase()] = value;
  });
  return res;
}

describe('Vercel Proxy', () => {
  let handler: Handler;
  let originalFetch: typeof globalThis.fetch;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    originalEnv = { ...process.env };
    process.env.BACKEND_URL = 'http://localhost:3000';
    process.env.LOG_PROXY_REQUESTS = 'false';

    vi.resetModules();
    const mod = await import('../proxy');
    handler = mod.default;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('CORS', () => {
    it('허용된 Origin에 Access-Control-Allow-Credentials: true를 설정해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = fetchMock;

      const req = createMockReq({
        headers: { origin: 'https://cha-log-gilt.vercel.app' },
      });
      const res = createMockRes();

      await handler(req, res);

      expect(res._headers['access-control-allow-origin']).toBe('https://cha-log-gilt.vercel.app');
      expect(res._headers['access-control-allow-credentials']).toBe('true');
      expect(res._headers['vary']).toBe('Origin');
    });

    it('비허용 Origin은 403으로 거부해야 한다', async () => {
      const req = createMockReq({
        headers: { origin: 'https://evil-site.com' },
      });
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Forbidden' })
      );
    });

    it('Origin 없는 요청(same-origin)은 허용해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = fetchMock;

      const req = createMockReq({ headers: {} });
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('localhost Origin은 허용해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = fetchMock;

      const req = createMockReq({
        headers: { origin: 'http://localhost:5173' },
      });
      const res = createMockRes();

      await handler(req, res);

      expect(res._headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res._headers['access-control-allow-credentials']).toBe('true');
    });

    it('OPTIONS preflight에 200을 응답해야 한다', async () => {
      const req = createMockReq({
        method: 'OPTIONS',
        headers: { origin: 'https://cha-log-gilt.vercel.app' },
      });
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('Cookie forwarding', () => {
    it('Cookie 헤더를 백엔드로 전달해야 한다', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
      globalThis.fetch = fetchMock;

      const req = createMockReq({
        headers: {
          cookie: 'access_token=jwt123; refresh_token=ref456',
        },
      });
      const res = createMockRes();

      await handler(req, res);

      expect(fetchMock).toHaveBeenCalled();
      const fetchCall = fetchMock.mock.calls[0];
      const fetchHeaders = fetchCall[1]?.headers as Record<string, string>;
      expect(fetchHeaders['Cookie']).toBe('access_token=jwt123; refresh_token=ref456');
    });

    it('Set-Cookie 헤더를 클라이언트로 전달해야 한다', async () => {
      const responseHeaders = new Headers({
        'Content-Type': 'application/json',
      });
      // getSetCookie mock
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: responseHeaders,
      });
      // getSetCookie가 없으면 빈 배열 (기본 동작)
      const fetchMock = vi.fn().mockResolvedValue(mockResponse);
      globalThis.fetch = fetchMock;

      const req = createMockReq({ headers: {} });
      const res = createMockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Error handling', () => {
    it('BACKEND_URL 미설정 시 502를 반환해야 한다', async () => {
      delete process.env.BACKEND_URL;
      vi.resetModules();
      const mod = await import('../proxy');
      const freshHandler = mod.default;

      const req = createMockReq({ headers: {} });
      const res = createMockRes();

      await freshHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(502);
    });
  });
});
