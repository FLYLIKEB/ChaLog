import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

const BACKEND_URL = process.env.BACKEND_URL || 'http://52.78.150.124:3000';
const LOG_PROXY_REQUESTS =
  (process.env.LOG_PROXY_REQUESTS ?? 'true').toLowerCase() !== 'false';

export default async function handler(req: any, res: any) {
  // 변수들을 함수 상단에서 선언 (스코프 문제 해결)
  let requestId: string = '';
  let backendUrl: string = '';
  let pathString: string = '';
  let startedAt: number = Date.now();
  
  try {
    // 디버깅: 요청 정보 로깅
    console.log('[Proxy] Request received:', {
      method: req.method,
      url: req.url,
      query: req.query,
      headers: req.headers ? Object.keys(req.headers) : 'no headers',
    });

    // Vercel Serverless Function에서 query는 자동으로 파싱됨
    const rawPath = req.query?.path;
    pathString = Array.isArray(rawPath)
      ? rawPath.join('/')
      : rawPath || '';

    if (!pathString) {
      console.error('[Proxy] Missing path parameter:', { query: req.query });
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing path parameter',
        debug: process.env.VERCEL_ENV === 'development' ? { query: req.query } : undefined,
      });
      return;
    }

    // req.query에서 path를 제외한 나머지 쿼리 파라미터 추출
    const queryParams = new URLSearchParams();
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (key !== 'path') {
          const value = req.query[key];
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value);
          }
        }
      });
    }
    
    backendUrl = `${BACKEND_URL}/${pathString}${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    startedAt = Date.now();
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

    // POST, PUT, PATCH 등의 경우 body 처리
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        // 이미 문자열이면 그대로 사용, 객체면 JSON 문자열로 변환
        fetchOptions.body =
          typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
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
      requestId: requestId || 'unknown',
      backendUrl: backendUrl || BACKEND_URL,
      method: req?.method || 'unknown',
      path: pathString || 'unknown',
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
          backendUrl: backendUrl || BACKEND_URL,
          timeoutMs,
          requestId: requestId || 'unknown',
        } : undefined,
      });
    } else if (isNetworkError) {
      res.status(502).json({
        error: 'Bad Gateway',
        message: '백엔드 서버에 연결할 수 없습니다',
        details: isDevelopment ? {
          backendUrl: backendUrl || BACKEND_URL,
          errorMessage: errorObj.message,
          requestId: requestId || 'unknown',
        } : {
          backendUrl: (backendUrl || BACKEND_URL).replace(/\/\/.*@/, '//***@'), // 비밀번호 숨김
        },
      });
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: '프록시 서버에서 오류가 발생했습니다',
        details: isDevelopment ? {
          errorName: errorObj.name,
          errorMessage: errorObj.message,
          backendUrl: backendUrl || BACKEND_URL,
          requestId: requestId || 'unknown',
        } : {
          requestId: requestId || 'unknown',
        },
      });
    }
  }
}


