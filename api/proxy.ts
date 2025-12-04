const BACKEND_URL = process.env.BACKEND_URL || 'http://52.78.150.124:3000';
const LOG_PROXY_REQUESTS =
  (process.env.LOG_PROXY_REQUESTS ?? 'true').toLowerCase() !== 'false';

export default async function handler(req: any, res: any) {
  // CORS 헤더 먼저 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let requestId = '';
  let backendUrl = '';
  let pathString = '';
  
  try {
    // req와 res 유효성 검사
    if (!req || !res) {
      console.error('[Proxy] Invalid req or res');
      res.status(500).json({ 
        error: 'Invalid request/response objects',
        message: '프록시 서버 설정 오류',
        statusCode: 500
      });
      return;
    }

    // path 파라미터 추출
    let rawPath: string | string[] | undefined = req.query?.path;
    
    if (!rawPath && req.url) {
      try {
        // WHATWG URL API 사용 (url.parse() 대신)
        const baseUrl = req.headers.host 
          ? `https://${req.headers.host}` 
          : 'http://localhost';
        const urlObj = new URL(req.url, baseUrl);
        rawPath = urlObj.searchParams.get('path') || '';
      } catch (e) {
        console.error('[Proxy] Failed to parse URL:', e);
      }
    }
    
    pathString = Array.isArray(rawPath)
      ? rawPath.join('/')
      : rawPath || '';

    if (!pathString) {
      console.error('[Proxy] Missing path parameter');
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing path parameter',
        statusCode: 400,
        debug: process.env.VERCEL_ENV === 'development' ? { 
          query: req.query,
          url: req.url 
        } : undefined
      });
      return;
    }

    // 쿼리 파라미터 추출
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
    
    if (LOG_PROXY_REQUESTS) {
      console.info('[Proxy] ▶', {
        requestId,
        method: req.method,
        path: pathString,
        backendUrl,
      });
    }

    // fetch 옵션 설정
    const controller = new AbortController();
    const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 30000);
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

    // body 처리
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // 백엔드로 요청 전송
    let fetchResponse: Response;
    try {
      // URL 유효성 검사
      try {
        new URL(backendUrl);
      } catch (urlError) {
        throw new Error(`Invalid backend URL: ${backendUrl}`);
      }
      
      fetchResponse = await fetch(backendUrl, {
        ...fetchOptions,
        // Vercel 환경에서 네트워크 에러 방지를 위한 추가 옵션
        keepalive: false,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (LOG_PROXY_REQUESTS) {
        console.error('[Proxy] ❌ Fetch failed:', {
          requestId,
          backendUrl,
          errorName: fetchError?.name,
          errorMessage: fetchError?.message,
        });
      }
      throw fetchError;
    }

    if (LOG_PROXY_REQUESTS) {
      console.info('[Proxy] ◀', {
        requestId,
        status: fetchResponse.status,
      });
    }

    // 상태 코드 설정
    res.status(fetchResponse.status);

    // 헤더 복사
    fetchResponse.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    // CORS 헤더 재설정 (덮어쓰기 방지)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 응답 본문 읽기
    const contentType = fetchResponse.headers.get('content-type') || '';
    let responseBody: any;
    
    try {
      if (contentType.includes('application/json')) {
        responseBody = await fetchResponse.json();
        // 에러 응답인 경우 메시지 보장
        if (!fetchResponse.ok && !responseBody.message && !responseBody.error) {
          responseBody.message = `서버 오류 (${fetchResponse.status})`;
        }
      } else {
        const textData = await fetchResponse.text();
        if (textData) {
          try {
            responseBody = JSON.parse(textData);
          } catch {
            responseBody = { message: textData };
          }
        } else {
          responseBody = { 
            message: fetchResponse.statusText || `서버 응답 (${fetchResponse.status})` 
          };
        }
      }
    } catch (readError: any) {
      console.error('[Proxy] Failed to read response:', readError);
      responseBody = {
        error: 'Failed to read response',
        message: `서버 응답을 읽을 수 없습니다 (${fetchResponse.status})`,
        statusCode: fetchResponse.status,
      };
    }

    // JSON으로 응답 전송
    res.json(responseBody);
    
  } catch (error: any) {
    const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 30000);
    const isAbortError = error?.name === 'AbortError';
    const isNetworkError = 
      error?.message?.includes('fetch failed') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('ENOTFOUND') ||
      error?.message?.includes('ETIMEDOUT') ||
      error?.message?.includes('ECONNRESET');
    
    console.error('[Proxy] ❌ Error:', {
      requestId: requestId || 'unknown',
      backendUrl: backendUrl || BACKEND_URL,
      method: req?.method || 'unknown',
      path: pathString || 'unknown',
      errorName: error?.name,
      errorMessage: error?.message,
      isAbortError,
      isNetworkError,
    });

    // CORS 헤더 설정
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    try {
      if (isAbortError) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `백엔드 서버 응답 시간 초과 (${timeoutMs}ms)`,
          statusCode: 504,
        });
      } else if (isNetworkError) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: '백엔드 서버에 연결할 수 없습니다',
          statusCode: 502,
          details: {
            errorMessage: error?.message || '알 수 없는 네트워크 오류',
          },
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error?.message || '프록시 서버에서 오류가 발생했습니다',
          statusCode: 500,
        });
      }
    } catch (responseError) {
      console.error('[Proxy] Failed to send error response:', responseError);
    }
  }
}
