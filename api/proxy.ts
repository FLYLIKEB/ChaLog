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


