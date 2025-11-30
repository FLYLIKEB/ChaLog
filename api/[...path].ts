// Vercel Serverless Function으로 백엔드 API 프록시
// 외부 HTTP 엔드포인트를 프록시하기 위해 Serverless Function 사용

import { Readable } from 'node:stream';

const BACKEND_URL = process.env.BACKEND_URL || 'http://52.78.150.124:3000';
const LOG_PROXY_REQUESTS = (process.env.LOG_PROXY_REQUESTS ?? 'true').toLowerCase() !== 'false';

export default async function handler(req: any, res: any) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  // 쿼리 문자열 포함 전체 URL 구성
  const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';
  const backendUrl = pathString 
    ? `${BACKEND_URL}/${pathString}${queryString ? `?${queryString}` : ''}`
    : `${BACKEND_URL}${queryString ? `?${queryString}` : ''}`;

  try {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    if (LOG_PROXY_REQUESTS) {
      console.info('[Proxy] ▶', { requestId, method: req.method, path: pathString || '/', backendUrl });
    }

    const controller = new AbortController();
    const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 10000);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
      signal: controller.signal,
    };

    // Authorization 헤더 복사
    if (req.headers.authorization) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: req.headers.authorization,
      };
    }

    // Body 처리 (GET, HEAD 제외)
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const fetchResponse = await fetch(backendUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (LOG_PROXY_REQUESTS) {
      console.info('[Proxy] ◀', { requestId, status: fetchResponse.status, durationMs: Date.now() - startedAt });
    }
    // 응답 헤더 복사
    res.status(fetchResponse.status);
    fetchResponse.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });
    const contentType = fetchResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const jsonData = await fetchResponse.json();
      res.json(jsonData);
      return;
    }
    if (fetchResponse.body) {
      const nodeStream = Readable.fromWeb(fetchResponse.body as ReadableStream);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    const isAbortError = (error as Error).name === 'AbortError';
    console.error('[Proxy] ❌', {
      backendUrl,
      method: req.method,
      message: (error as Error).message,
      stack: (error as Error).stack,
      timeoutMs,
      aborted: isAbortError,
    });
    if (isAbortError) {
      res.status(504).json({
        error: 'Gateway Timeout',
        message: `Backend request timed out after ${timeoutMs}ms`,
      });
    } else {
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to connect to backend server',
      });
    }
  }
}

