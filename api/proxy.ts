import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

const BACKEND_URL = process.env.BACKEND_URL || 'http://52.78.150.124:3000';
const LOG_PROXY_REQUESTS =
  (process.env.LOG_PROXY_REQUESTS ?? 'true').toLowerCase() !== 'false';

export default async function handler(req: any, res: any) {
  const rawPath = req.query.path;
  const pathString = Array.isArray(rawPath)
    ? rawPath.join('/')
    : rawPath || '';

  if (!pathString) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing path parameter',
    });
    return;
  }

  const queryString = req.url?.includes('?')
    ? req.url.substring(req.url.indexOf('?') + 1)
    : '';
  // path 파라미터 외 나머지 쿼리만 추출
  const searchParams = new URLSearchParams(queryString);
  searchParams.delete('path');
  const backendUrl = `${BACKEND_URL}/${pathString}${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`;

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();

  try {
    if (LOG_PROXY_REQUESTS) {
      console.info('[Proxy] ▶', {
        requestId,
        method: req.method,
        path: pathString,
        backendUrl,
      });
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

    if (req.headers.authorization) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: req.headers.authorization,
      };
    }

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const fetchResponse = await fetch(backendUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (LOG_PROXY_REQUESTS) {
      console.info('[Proxy] ◀', {
        requestId,
        status: fetchResponse.status,
        durationMs: Date.now() - startedAt,
      });
    }

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
      const nodeStream = Readable.fromWeb(
        fetchResponse.body as unknown as NodeReadableStream<any>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 10000);
    const errorObj = error as Error;
    const isAbortError = errorObj.name === 'AbortError';
    const isNetworkError = 
      errorObj.message.includes('fetch failed') ||
      errorObj.message.includes('ECONNREFUSED') ||
      errorObj.message.includes('ENOTFOUND') ||
      errorObj.message.includes('ETIMEDOUT');
    
    // 상세한 에러 로깅 (Vercel 로그에 표시됨)
    console.error('[Proxy] ❌ Error Details:', {
      requestId,
      backendUrl,
      method: req.method,
      path: pathString,
      errorName: errorObj.name,
      errorMessage: errorObj.message,
      errorStack: errorObj.stack,
      timeoutMs,
      isAbortError,
      isNetworkError,
      durationMs: Date.now() - startedAt,
    });

    // 클라이언트에게 반환할 에러 응답
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.VERCEL_ENV === 'development';
    
    if (isAbortError) {
      res.status(504).json({
        error: 'Gateway Timeout',
        message: `백엔드 서버 응답 시간 초과 (${timeoutMs}ms)`,
        details: isDevelopment ? {
          backendUrl,
          timeoutMs,
          requestId,
        } : undefined,
      });
    } else if (isNetworkError) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: '백엔드 서버에 연결할 수 없습니다',
        details: isDevelopment ? {
          backendUrl,
          errorMessage: errorObj.message,
          requestId,
        } : {
          backendUrl: backendUrl.replace(/\/\/.*@/, '//***@'), // 비밀번호 숨김
        },
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: '프록시 서버에서 오류가 발생했습니다',
        details: isDevelopment ? {
          errorName: errorObj.name,
          errorMessage: errorObj.message,
          backendUrl,
          requestId,
        } : {
          requestId,
        },
      });
    }
  }
}


