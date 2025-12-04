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
  // 변수들을 함수 상단에서 선언 (스코프 문제 해결)
  let requestId: string = '';
  let backendUrl: string = '';
  let pathString: string = '';
  let startedAt: number = Date.now();
  
  // 기본 에러 핸들러
  const sendError = (status: number, message: string, details?: any) => {
    try {
      if (res && typeof res.status === 'function') {
        res.status(status).json({ error: message, ...details });
      }
    } catch (e) {
      console.error('[Proxy] Failed to send error response:', e);
    }
  };
  
  try {
    // req와 res 유효성 검사
    if (!req || !res) {
      console.error('[Proxy] Invalid req or res:', { req: !!req, res: !!res });
      return sendError(500, 'Invalid request/response objects');
    }

    // 디버깅: 요청 정보 로깅
    console.log('[Proxy] Request received:', {
      method: req.method,
      url: req.url,
      query: req.query,
      hasHeaders: !!req.headers,
    });

    // Vercel Serverless Function에서 query는 자동으로 파싱됨
    // req.query가 없으면 req.url에서 직접 파싱 시도
    let rawPath: string | string[] | undefined = req.query?.path;
    
    if (!rawPath && req.url) {
      // req.query가 없으면 URL에서 직접 파싱
      try {
        const urlObj = new URL(req.url, 'http://localhost');
        rawPath = urlObj.searchParams.get('path') || '';
      } catch (e) {
        console.error('[Proxy] Failed to parse URL:', e);
      }
    }
    
    pathString = Array.isArray(rawPath)
      ? rawPath.join('/')
      : rawPath || '';

    if (!pathString) {
      console.error('[Proxy] Missing path parameter:', { 
        query: req.query, 
        url: req.url,
        hasQuery: !!req.query 
      });
      return sendError(400, 'Missing path parameter', {
        debug: process.env.VERCEL_ENV === 'development' ? { 
          query: req.query,
          url: req.url 
        } : undefined
      });
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

    // 상태 코드 설정
    res.status(fetchResponse.status);

    // 헤더 복사 (CORS 헤더 포함)
    fetchResponse.headers.forEach((value, key) => {
      // content-encoding과 transfer-encoding은 제외 (Vercel이 자동 처리)
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        res.setHeader(key, value);
      }
    });

    // CORS 헤더 명시적 설정 (에러 응답에도 필요)
    if (!res.getHeader('access-control-allow-origin')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    const contentType = fetchResponse.headers.get('content-type') || '';
    
    // 응답 본문 읽기
    let responseBody: any;
    try {
      if (contentType.includes('application/json')) {
        responseBody = await fetchResponse.json();
        // 에러 응답인 경우에도 메시지가 포함되도록 보장
        if (!fetchResponse.ok && !responseBody.message && !responseBody.error) {
          responseBody.message = responseBody.message || `서버 오류 (${fetchResponse.status})`;
        }
      } else {
        // 비JSON 응답은 텍스트로 읽기
        const textData = await fetchResponse.text();
        if (textData) {
          try {
            // JSON일 수도 있으므로 파싱 시도
            responseBody = JSON.parse(textData);
          } catch {
            // JSON이 아니면 텍스트로 처리
            responseBody = { message: textData };
          }
        } else {
            responseBody = { message: fetchResponse.statusText || `서버 응답 (${fetchResponse.status})` };
        }
      }
    } catch (readError) {
      console.error('[Proxy] Failed to read response:', readError);
      responseBody = {
        error: 'Failed to read response',
        message: `서버 응답을 읽을 수 없습니다 (${fetchResponse.status})`,
        statusCode: fetchResponse.status,
      };
    }

    // JSON으로 응답 전송
    res.json(responseBody);
  } catch (error) {
    const timeoutMs = Number(process.env.BACKEND_TIMEOUT_MS || 10000);
    const errorObj = error as Error;
    const isAbortError = errorObj.name === 'AbortError';
    const isNetworkError = 
      errorObj.message.includes('fetch failed') ||
      errorObj.message.includes('ECONNREFUSED') ||
      errorObj.message.includes('ENOTFOUND') ||
      errorObj.message.includes('ETIMEDOUT') ||
      errorObj.message.includes('ECONNRESET');
    
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

    // CORS 헤더 설정 (에러 응답에도 필요)
    try {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    } catch (headerError) {
      console.error('[Proxy] Failed to set error headers:', headerError);
    }

    // 클라이언트에게 반환할 에러 응답
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.VERCEL_ENV === 'development';
    
    try {
      if (isAbortError) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `백엔드 서버 응답 시간 초과 (${timeoutMs}ms)`,
          statusCode: 504,
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
          statusCode: 502,
          details: isDevelopment ? {
            backendUrl: backendUrl || BACKEND_URL,
            errorMessage: errorObj.message,
            requestId: requestId || 'unknown',
          } : {
            backendUrl: (backendUrl || BACKEND_URL).replace(/\/\/.*@/, '//***@'), // 비밀번호 숨김
            requestId: requestId || 'unknown',
          },
        });
      } else {
        res.status(500).json({
          error: 'Internal Server Error',
          message: errorObj.message || '프록시 서버에서 오류가 발생했습니다',
          statusCode: 500,
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
    } catch (responseError) {
      // 응답 전송 실패 시 로그만 남김
      console.error('[Proxy] Failed to send error response:', responseError);
    }
  }
}


