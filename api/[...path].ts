// Vercel Serverless Function으로 백엔드 API 프록시
// 외부 HTTP 엔드포인트를 프록시하기 위해 Serverless Function 사용

const BACKEND_URL = 'http://52.78.150.124:3000';

export default async function handler(req: any, res: any) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  // 쿼리 문자열 포함 전체 URL 구성
  const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';
  const backendUrl = `${BACKEND_URL}/${pathString}${queryString ? `?${queryString}` : ''}`;

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
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
    const data = await fetchResponse.text();
    
    // 응답 헤더 복사
    res.status(fetchResponse.status);
    fetchResponse.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding' && key !== 'content-length') {
        res.setHeader(key, value);
      }
    });

    // JSON인지 확인하여 파싱
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch {
      res.send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(502).json({
      error: 'Bad Gateway',
      message: 'Failed to connect to backend server',
    });
  }
}

