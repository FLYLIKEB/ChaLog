import { API_TIMEOUT } from '../constants';
import { Tea, User } from '../types';
import { logger } from './logger';

// API Base URL 설정
// 프로덕션(Vercel): /api 프록시 사용 (vercel.json의 rewrites 설정)
// 개발 환경: Vite 프록시를 통해 /api 사용 (CORS 문제 방지)
const API_BASE_URL = (() => {
  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const networkInfo = typeof navigator !== 'undefined' ? ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection) : null;
  
  // 프로덕션 환경에서 Vercel 배포인 경우 항상 /api 사용
  if (import.meta.env.PROD && typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    // Vercel rewrites를 통해 /api로 프록시됨
    const baseURL = '/api';
    if (typeof console !== 'undefined' && console.log) {
      console.log('[API Config] 프로덕션 환경 (Vercel)', {
        baseURL,
        hostname: window.location.hostname,
        origin: window.location.origin,
        isMobile,
        networkType: networkInfo?.effectiveType || 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
      });
    }
    return baseURL;
  }
  // 개발 환경: Vite 프록시를 사용하여 같은 origin으로 요청 (CORS 문제 방지)
  // 환경 변수가 명시적으로 설정되어 있으면 사용, 없으면 /api 프록시 사용
  const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
  if (typeof console !== 'undefined' && console.log) {
    console.log('[API Config] 환경 설정', {
      isProduction: import.meta.env.PROD,
      isDevelopment: import.meta.env.DEV,
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      finalBaseURL: baseURL,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
      isMobile,
      networkType: networkInfo?.effectiveType || 'unknown',
      networkDownlink: networkInfo?.downlink || 'unknown',
      networkRtt: networkInfo?.rtt || 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
    });
  }
  return baseURL;
})();

export interface ApiError {
  message: string;
  statusCode: number;
}

/**
 * ISO 날짜 문자열을 Date 객체로 변환하고, DECIMAL 필드를 숫자로 변환하는 재귀적 유틸리티
 * 객체와 배열을 순회하며 모든 날짜 문자열을 Date 객체로 변환하고, 평점 필드를 숫자로 변환
 */
function parseDates<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 배열인 경우 각 요소에 대해 재귀 호출
  if (Array.isArray(obj)) {
    return obj.map(parseDates) as T;
  }

  // 객체인 경우
  if (typeof obj === 'object') {
    const parsed = {} as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // createdAt, updatedAt 등 날짜 필드인 경우 Date로 변환
        if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
          const date = new Date(value);
          // 유효한 날짜인지 확인
          parsed[key] = isNaN(date.getTime()) ? value : date;
        } 
        // 평점 필드인 경우 숫자로 변환 (DECIMAL 타입이 문자열로 반환됨)
        else if ((key === 'rating' || key === 'averageRating') && typeof value === 'string') {
          const num = parseFloat(value);
          parsed[key] = isNaN(num) ? value : num;
        } 
        else {
          // 중첩된 객체나 배열인 경우 재귀 호출
          parsed[key] = parseDates(value);
        }
      }
    }
    return parsed as T;
  }

  return obj;
}

interface BackendNote {
  id: number;
  teaId: number;
  tea?: { name: string };
  userId: number;
  user?: { name: string };
  schemaId: number;
  schema?: {
    id: number;
    code: string;
    version: string;
    nameKo: string;
    nameEn: string;
    descriptionKo?: string | null;
    descriptionEn?: string | null;
    overallMinValue: number;
    overallMaxValue: number;
    overallStep: number;
    isActive: boolean;
  };
  overallRating: number | null;
  isRatingIncluded: boolean;
  axisValues?: Array<{
    axisId: number;
    valueNumeric: number;
    axis?: {
      id: number;
      schemaId: number;
      code: string;
      nameKo: string;
      nameEn: string;
      descriptionKo?: string | null;
      descriptionEn?: string | null;
      minValue: number;
      maxValue: number;
      stepValue: number;
      displayOrder: number;
      isRequired: boolean;
      teaType?: string | null;
    };
  }>;
  memo: string | null;
  images?: string[] | null;
  noteTags?: Array<{ tag: { name: string } }>;
  tags?: string[] | null; // 레거시 지원 (직접 tags 필드가 있는 경우)
  isPublic: boolean;
  createdAt: Date | string;
}

interface NormalizedNote {
  id: number;
  teaId: number;
  teaName: string;
  userId: number;
  userName: string;
  schemaId: number;
  schema?: {
    id: number;
    code: string;
    version: string;
    nameKo: string;
    nameEn: string;
    descriptionKo?: string | null;
    descriptionEn?: string | null;
    overallMinValue: number;
    overallMaxValue: number;
    overallStep: number;
    isActive: boolean;
  };
  overallRating: number | null;
  isRatingIncluded: boolean;
  axisValues?: Array<{
    axisId: number;
    valueNumeric: number;
    axis?: {
      id: number;
      schemaId: number;
      code: string;
      nameKo: string;
      nameEn: string;
      descriptionKo?: string | null;
      descriptionEn?: string | null;
      minValue: number;
      maxValue: number;
      stepValue: number;
      displayOrder: number;
      isRequired: boolean;
      teaType?: string | null;
    };
  }>;
  memo: string | null;
  images?: string[];
  tags?: string[];
  isPublic: boolean;
  createdAt: Date;
}

/**
 * Note 응답을 프론트엔드 타입으로 정규화
 * 백엔드의 tea/user 객체에서 teaName/userName을 추출
 * null 값들을 안전한 기본값으로 변환
 */
function normalizeNote(note: BackendNote): NormalizedNote {
  if (!note) {
    throw new Error('Note data is required');
  }
  
  // noteTags 관계에서 tags 배열 추출
  let tags: string[] | undefined;
  if (note.noteTags && note.noteTags.length > 0) {
    tags = note.noteTags.map(nt => nt.tag.name);
  } else if (note.tags && note.tags.length > 0) {
    // 레거시 지원: 직접 tags 필드가 있는 경우
    tags = note.tags;
  }

  return {
    ...note,
    teaName: note.tea?.name || '',
    userName: note.user?.name || '',
    // memo는 null을 유지 (이제 nullable)
    memo: note.memo,
    // images가 null이면 undefined로 변환, 빈 배열이면 undefined로 변환
    images: note.images && note.images.length > 0 ? note.images : undefined,
    // tags 추출: noteTags 관계에서 추출하거나 직접 tags 필드 사용
    tags: tags && tags.length > 0 ? tags : undefined,
    createdAt: typeof note.createdAt === 'string' ? new Date(note.createdAt) : note.createdAt,
  };
}

/**
 * Note 배열 또는 단일 Note를 정규화
 */
function normalizeNotes<T extends BackendNote | BackendNote[]>(data: T): T extends BackendNote[] ? NormalizedNote[] : NormalizedNote {
  if (Array.isArray(data)) {
    return data.map(normalizeNote) as T extends BackendNote[] ? NormalizedNote[] : NormalizedNote;
  }
  return normalizeNote(data as BackendNote) as T extends BackendNote[] ? NormalizedNote[] : NormalizedNote;
}

/**
 * URL이 loopback 주소 공간인지 확인 (localhost, 127.0.0.1 등)
 * Chrome의 Private Network Access 정책에 대응하기 위함
 */
function isLoopbackRequest(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // localhost 또는 127.0.0.1, IPv6 loopback
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/**
 * URL이 private IP 주소 공간인지 확인
 * Chrome의 Private Network Access 정책에 대응하기 위함
 */
function isPrivateNetworkRequest(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // .local 도메인
    if (hostname.endsWith('.local')) {
      return true;
    }
    
    // Private IP 주소 범위 확인
    // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, a, b] = match.map(Number);
      if (a === 10) return true; // 10.0.0.0/8
      if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
      if (a === 192 && b === 168) return true; // 192.168.0.0/16
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * URL이 로컬 네트워크 요청인지 확인 (loopback 또는 private)
 * Chrome의 로컬 네트워크 요청 정책에 대응하기 위함
 */
function isLocalNetworkRequest(url: string): boolean {
  return isLoopbackRequest(url) || isPrivateNetworkRequest(url);
}

/**
 * targetAddressSpace 옵션 지원 여부 확인
 * Chrome 124+에서만 지원되므로 런타임에서 기능 감지 필요
 * 
 * 참고: targetAddressSpace는 WICG 초안 사양이며 아직 표준화되지 않았습니다.
 * Chrome 124+, Edge 124+에서만 지원되며, Firefox와 Safari는 지원하지 않습니다.
 * 
 * 지원하지 않는 브라우저에서는 옵션이 무시되므로 안전하게 항상 시도합니다.
 */
function supportsTargetAddressSpace(): boolean {
  // 브라우저 환경인지 확인
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return false; // 서버 사이드 렌더링 환경
  }
  
  // Chrome/Chromium 계열 브라우저 확인
  const userAgent = navigator.userAgent.toLowerCase();
  const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
  const isEdge = userAgent.includes('edg');
  
  // Chrome 또는 Edge 계열이면 targetAddressSpace 지원 가능
  // 지원하지 않는 브라우저에서는 옵션이 무시되므로 안전하게 true 반환
  return isChrome || isEdge;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof navigator !== 'undefined' && typeof console !== 'undefined' && console.log) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('[ApiClient] 초기화', {
        baseURL: this.baseURL,
        isMobile,
        userAgent: navigator.userAgent.substring(0, 100),
      });
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const token = localStorage.getItem('access_token');
    const timeout = options.timeout ?? API_TIMEOUT;
    
    // 모바일 환경 감지
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const networkInfo = typeof navigator !== 'undefined' ? ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection) : null;
    
    logger.info(`[API Request ${requestId}] 시작`, {
      endpoint,
      method: options.method || 'GET',
      isMobile,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
      networkType: networkInfo?.effectiveType || 'unknown',
      networkDownlink: networkInfo?.downlink || 'unknown',
      networkRtt: networkInfo?.rtt || 'unknown',
      timeout,
      hasToken: !!token,
      tokenLength: token?.length || 0,
    });
    
    // timeout을 제거한 fetch 옵션 생성
    const { timeout: _, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      logger.debug(`[API Request ${requestId}] 인증 토큰 포함`, {
        tokenPrefix: token.substring(0, 20) + '...',
      });
    } else {
      logger.warn(`[API Request ${requestId}] 인증 토큰 없음`);
    }

    // 테스트 환경에서 상대 URL을 절대 URL로 변환
    let url: string;
    if (this.baseURL.startsWith('/')) {
      // 상대 경로인 경우 절대 URL로 변환
      // 테스트 환경(jsdom)에서는 window.location.origin이 없을 수 있으므로 기본값 사용
      const origin = (typeof window !== 'undefined' && window.location?.origin) 
        ? window.location.origin 
        : 'http://localhost:5173';
      url = `${origin}${this.baseURL}${endpoint}`;
    } else {
      url = `${this.baseURL}${endpoint}`;
    }
    
    logger.info(`[API Request ${requestId}] 요청 URL`, {
      fullUrl: url,
      baseURL: this.baseURL,
      endpoint,
      isLocalNetwork: isLocalNetworkRequest(url),
      isLoopback: isLoopbackRequest(url),
      isPrivate: isPrivateNetworkRequest(url),
    });
    
    // Chrome의 Private Network Access 정책 대응
    // targetAddressSpace 옵션을 fetch 옵션에 직접 포함
    const fetchOptionsWithAddressSpace: RequestInit & { targetAddressSpace?: 'private' | 'local' } = {
      ...fetchOptions,
      headers,
    };
    
    // 로컬 네트워크 요청이고 브라우저가 targetAddressSpace를 지원하는 경우 설정
    if (isLocalNetworkRequest(url) && supportsTargetAddressSpace()) {
      // localhost(loopback)는 'local', private IP는 'private' 사용
      const addressSpace: 'local' | 'private' = isLoopbackRequest(url) ? 'local' : 'private';
      fetchOptionsWithAddressSpace.targetAddressSpace = addressSpace;
      logger.debug(`[API Request ${requestId}] targetAddressSpace 설정`, {
        addressSpace,
        supportsTargetAddressSpace: supportsTargetAddressSpace(),
      });
    } else if (isLocalNetworkRequest(url)) {
      logger.warn(`[API Request ${requestId}] 로컬 네트워크 요청이지만 targetAddressSpace 미지원`, {
        supportsTargetAddressSpace: supportsTargetAddressSpace(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'unknown',
      });
    }
    
    // AbortController를 사용한 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.error(`[API Request ${requestId}] 타임아웃 발생`, {
        timeout,
        elapsedTime: Date.now() - startTime,
      });
      controller.abort();
    }, timeout);
    
    logger.debug(`[API Request ${requestId}] fetch 옵션`, {
      method: fetchOptionsWithAddressSpace.method || 'GET',
      headers: Object.keys(headers),
      hasBody: !!fetchOptionsWithAddressSpace.body,
      bodySize: fetchOptionsWithAddressSpace.body ? String(fetchOptionsWithAddressSpace.body).length : 0,
      hasSignal: !!controller.signal,
      targetAddressSpace: (fetchOptionsWithAddressSpace as any).targetAddressSpace,
    });
    
    try {
      logger.info(`[API Request ${requestId}] fetch 호출 시작`);
      const response = await fetch(url, {
        ...fetchOptionsWithAddressSpace,
        signal: controller.signal,
      });
      
      const responseTime = Date.now() - startTime;
      logger.info(`[API Request ${requestId}] 응답 수신`, {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        headers: Object.fromEntries(response.headers.entries()),
        ok: response.ok,
      });

      if (!response.ok) {
        logger.error(`[API Request ${requestId}] 응답 오류`, {
          status: response.status,
          statusText: response.statusText,
          responseTime: `${Date.now() - startTime}ms`,
          contentType: response.headers.get('content-type'),
        });
        
        // 응답 본문 읽기 시도 (JSON 또는 텍스트)
        let error: any;
        const contentType = response.headers.get('content-type') || '';
        
        try {
          if (contentType.includes('application/json')) {
            error = await response.json();
            logger.error(`[API Request ${requestId}] 에러 응답 본문 (JSON)`, error);
          } else {
            const text = await response.text();
            logger.error(`[API Request ${requestId}] 에러 응답 본문 (텍스트)`, {
              text: text.substring(0, 500), // 처음 500자만
              fullLength: text.length,
            });
            try {
              // 텍스트가 JSON일 수도 있으므로 파싱 시도
              error = JSON.parse(text);
            } catch {
              // JSON이 아니면 텍스트로 처리
              error = { message: text || response.statusText };
            }
          }
        } catch (parseError) {
          logger.error(`[API Request ${requestId}] 응답 본문 파싱 실패`, {
            parseError,
            contentType,
          });
          // 파싱 실패 시 기본값 사용
          error = {
            message: response.statusText || `HTTP error! status: ${response.status}`,
            statusCode: response.status,
          };
        }
        
        // 에러 메시지 추출 (여러 필드 확인)
        let errorMessage: string | string[] = 
          error.message || 
          error.error || 
          error.details?.message ||
          response.statusText || 
          `HTTP error! status: ${response.status}`;
        
        // 배열인 경우 첫 번째 요소 사용, 아니면 문자열로 변환
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.length > 0 ? errorMessage[0] : '알 수 없는 오류가 발생했습니다.';
        } else if (typeof errorMessage !== 'string') {
          errorMessage = String(errorMessage);
        }
        
        // 백엔드에서 이미 한글 메시지를 보내지만, 혹시 모를 영어 메시지에 대비
        if (response.status === 401) {
          if (errorMessage.includes('Invalid credentials') || errorMessage.includes('invalid') || errorMessage.includes('credentials')) {
            errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
          } else if (errorMessage.includes('Unauthorized') && !errorMessage.includes('이메일')) {
            errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
          }
        } else if (response.status === 403) {
          if (errorMessage.includes('permission') || errorMessage.includes('Forbidden')) {
            // 백엔드에서 이미 한글 메시지를 보내므로 그대로 사용
            if (!errorMessage.match(/[가-힣]/)) {
              errorMessage = '접근 권한이 없습니다.';
            }
          } else {
            errorMessage = '접근 권한이 없습니다.';
          }
        } else if (response.status === 404) {
          if (!errorMessage.match(/[가-힣]/)) {
            if (errorMessage.includes('Tea') || errorMessage.includes('tea')) {
              errorMessage = '차를 찾을 수 없습니다.';
            } else if (errorMessage.includes('Note') || errorMessage.includes('note')) {
              errorMessage = '노트를 찾을 수 없습니다.';
            } else if (errorMessage.includes('User') || errorMessage.includes('user')) {
              errorMessage = '사용자를 찾을 수 없습니다.';
            } else {
              errorMessage = '요청한 리소스를 찾을 수 없습니다.';
            }
          }
        } else if (response.status === 409) {
          if (errorMessage.includes('already exists') || errorMessage.includes('exists')) {
            errorMessage = '이미 존재하는 이메일입니다.';
          }
        } else if (response.status === 500 || response.status === 502 || response.status === 504) {
          // 500, 502, 504 에러는 백엔드 메시지를 그대로 전달 (이미 한글이거나 상세 정보 포함)
          // 한글이 없으면 기본 메시지 사용
          if (!errorMessage.match(/[가-힣]/) && errorMessage === response.statusText) {
            if (response.status === 502) {
              errorMessage = '백엔드 서버에 연결할 수 없습니다.';
            } else if (response.status === 504) {
              errorMessage = '백엔드 서버 응답 시간이 초과되었습니다.';
            } else {
              errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            }
          }
        }
        
        // 상세 정보가 있으면 포함
        const apiError: ApiError = {
          message: errorMessage,
          statusCode: response.status,
        };
        
        logger.error(`[API Request ${requestId}] 최종 에러`, {
          apiError,
          totalTime: `${Date.now() - startTime}ms`,
        });
        
        throw apiError;
      }

      // 204 No Content 응답 처리
      if (response.status === 204) {
        logger.info(`[API Request ${requestId}] 성공 (204 No Content)`, {
          responseTime: `${Date.now() - startTime}ms`,
        });
        return null as T;
      }

      logger.debug(`[API Request ${requestId}] 응답 본문 파싱 시작`);
      let data: any;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim() === '') {
          logger.warn(`[API Request ${requestId}] 응답 본문이 비어있음`);
          data = null;
        } else {
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            logger.error(`[API Request ${requestId}] JSON 파싱 실패`, {
              parseError,
              responseText: responseText.substring(0, 500),
              contentType: response.headers.get('content-type'),
            });
            throw new Error(`응답을 파싱할 수 없습니다: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          }
        }
      } catch (textError) {
        logger.error(`[API Request ${requestId}] 응답 본문 읽기 실패`, {
          textError,
          errorName: textError instanceof Error ? textError.name : 'Unknown',
          errorMessage: textError instanceof Error ? textError.message : String(textError),
        });
        throw new Error(`응답을 읽을 수 없습니다: ${textError instanceof Error ? textError.message : String(textError)}`);
      }
      
      logger.debug(`[API Request ${requestId}] 응답 본문 파싱 완료`, {
        dataKeys: typeof data === 'object' && data !== null ? Object.keys(data) : 'not an object',
        isArray: Array.isArray(data),
        arrayLength: Array.isArray(data) ? data.length : undefined,
      });
      
      // 날짜 문자열을 Date 객체로 자동 변환
      const parsedData = parseDates(data);
      
      // Note 관련 응답인 경우 정규화 (tea/user 객체에서 teaName/userName 추출)
      const isNoteEndpoint = endpoint.startsWith('/notes');
      if (isNoteEndpoint) {
        logger.debug(`[API Request ${requestId}] Note 정규화 수행`);
        const normalized = normalizeNotes(parsedData as BackendNote | BackendNote[]) as T;
        logger.info(`[API Request ${requestId}] 성공 (Note 정규화 완료)`, {
          responseTime: `${Date.now() - startTime}ms`,
        });
        return normalized;
      }
      
      logger.info(`[API Request ${requestId}] 성공`, {
        responseTime: `${Date.now() - startTime}ms`,
      });
      return parsedData as T;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      // AbortError 처리 (타임아웃)
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(`[API Request ${requestId}] 타임아웃 에러`, {
          errorName: error.name,
          errorMessage: error.message,
          elapsedTime: `${elapsedTime}ms`,
          timeout,
          isMobile,
          networkType: networkInfo?.effectiveType || 'unknown',
        });
        throw new Error(`요청 시간이 초과되었습니다 (${timeout}ms)`);
      }
      
      // 네트워크 에러 상세 로깅
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logger.error(`[API Request ${requestId}] 네트워크 에러`, {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          elapsedTime: `${elapsedTime}ms`,
          url,
          isMobile,
          networkType: networkInfo?.effectiveType || 'unknown',
          networkDownlink: networkInfo?.downlink || 'unknown',
          networkRtt: networkInfo?.rtt || 'unknown',
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
        });
      } else {
        logger.error(`[API Request ${requestId}] 예외 발생`, {
          error,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          elapsedTime: `${elapsedTime}ms`,
        });
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    } finally {
      // fetch가 완료되면 타임아웃 클리어
      clearTimeout(timeoutId);
      const totalTime = Date.now() - startTime;
      logger.debug(`[API Request ${requestId}] 완료 (총 소요 시간: ${totalTime}ms)`);
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string): Promise<void> {
    await this.request<void>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const requestId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const token = localStorage.getItem('access_token');
    const timeout = API_TIMEOUT;
    
    // 모바일 환경 감지
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const networkInfo = typeof navigator !== 'undefined' ? ((navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection) : null;
    
    logger.info(`[File Upload ${requestId}] 시작`, {
      endpoint,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isMobile,
      networkType: networkInfo?.effectiveType || 'unknown',
      hasToken: !!token,
    });
    
    if (!token) {
      logger.error(`[File Upload ${requestId}] 인증 토큰 없음`);
      throw {
        message: '로그인이 필요합니다.',
        statusCode: 401,
      } as ApiError;
    }
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
    };

    const url = `${this.baseURL}${endpoint}`;
    
    logger.info(`[File Upload ${requestId}] 업로드 URL`, {
      url,
      baseURL: this.baseURL,
      endpoint,
    });
    
    const formData = new FormData();
    formData.append('image', file);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.error(`[File Upload ${requestId}] 타임아웃 발생`, {
        timeout,
        elapsedTime: Date.now() - startTime,
      });
      controller.abort();
    }, timeout);
    
    try {
      logger.info(`[File Upload ${requestId}] fetch 호출 시작`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });
      
      const responseTime = Date.now() - startTime;
      logger.info(`[File Upload ${requestId}] 응답 수신`, {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        ok: response.ok,
      });

      if (!response.ok) {
        logger.error(`[File Upload ${requestId}] 응답 오류`, {
          status: response.status,
          statusText: response.statusText,
          responseTime: `${Date.now() - startTime}ms`,
        });
        
        let error: any;
        const contentType = response.headers.get('content-type') || '';
        
        try {
          if (contentType.includes('application/json')) {
            error = await response.json();
            logger.error(`[File Upload ${requestId}] 에러 응답 본문 (JSON)`, error);
          } else {
            const text = await response.text();
            logger.error(`[File Upload ${requestId}] 에러 응답 본문 (텍스트)`, {
              text: text.substring(0, 500),
              fullLength: text.length,
            });
            try {
              error = JSON.parse(text);
            } catch {
              error = { message: text || response.statusText };
            }
          }
        } catch (parseError) {
          logger.error(`[File Upload ${requestId}] 응답 본문 파싱 실패`, {
            parseError,
            contentType,
          });
          error = {
            message: response.statusText || `HTTP error! status: ${response.status}`,
            statusCode: response.status,
          };
        }
        
        let errorMessage: string | string[] = 
          error.message || 
          error.error || 
          error.details?.message ||
          response.statusText || 
          `HTTP error! status: ${response.status}`;
        
        // 배열인 경우 첫 번째 요소 사용, 아니면 문자열로 변환
        if (Array.isArray(errorMessage)) {
          errorMessage = errorMessage.length > 0 ? errorMessage[0] : '알 수 없는 오류가 발생했습니다.';
        } else if (typeof errorMessage !== 'string') {
          errorMessage = String(errorMessage);
        }
        
        // 401 에러인 경우 명확한 메시지 표시
        if (response.status === 401) {
          if (!errorMessage.match(/[가-힣]/)) {
            errorMessage = '로그인이 필요합니다. 다시 로그인해주세요.';
          }
        }
        
        const apiError: ApiError = {
          message: errorMessage,
          statusCode: response.status,
        };
        
        logger.error(`[File Upload ${requestId}] 최종 에러`, {
          apiError,
          totalTime: `${Date.now() - startTime}ms`,
        });
        
        throw apiError;
      }

      logger.debug(`[File Upload ${requestId}] 응답 본문 파싱 시작`);
      const data = await response.json();
      logger.info(`[File Upload ${requestId}] 성공`, {
        responseTime: `${Date.now() - startTime}ms`,
        dataKeys: typeof data === 'object' && data !== null ? Object.keys(data) : 'not an object',
      });
      
      return data;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error(`[File Upload ${requestId}] 타임아웃 에러`, {
          errorName: error.name,
          elapsedTime: `${elapsedTime}ms`,
          timeout,
          isMobile,
          networkType: networkInfo?.effectiveType || 'unknown',
        });
        throw {
          message: '요청 시간이 초과되었습니다.',
          statusCode: 408,
        } as ApiError;
      }
      
      // 네트워크 에러 상세 로깅
      if (error instanceof TypeError && error.message.includes('fetch')) {
        logger.error(`[File Upload ${requestId}] 네트워크 에러`, {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
          elapsedTime: `${elapsedTime}ms`,
          url,
          isMobile,
          networkType: networkInfo?.effectiveType || 'unknown',
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
          fileSize: file.size,
          fileName: file.name,
        });
      } else {
        logger.error(`[File Upload ${requestId}] 예외 발생`, {
          error,
          errorName: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          elapsedTime: `${elapsedTime}ms`,
        });
      }
      
      throw error;
    } finally {
      clearTimeout(timeoutId);
      const totalTime = Date.now() - startTime;
      logger.debug(`[File Upload ${requestId}] 완료 (총 소요 시간: ${totalTime}ms)`);
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// API 엔드포인트 타입 정의
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface KakaoLoginRequest {
  accessToken: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: number;
    email: string | null;
    name: string;
  };
}

export interface CreateTeaRequest {
  name: string;
  year?: number;
  type: string;
  seller?: string;
  origin?: string;
}

export interface CreateNoteRequest {
  teaId: number;
  schemaId: number;
  overallRating?: number | null;
  isRatingIncluded?: boolean;
  axisValues: Array<{
    axisId: number;
    value: number;
  }>;
  memo?: string | null;
  images?: string[] | null;
  tags?: string[];
  isPublic: boolean;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {}

// API 함수들
export const authApi = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<AuthResponse>('/auth/register', data),
  loginWithKakao: (data: KakaoLoginRequest) => apiClient.post<AuthResponse>('/auth/kakao', data),
  getProfile: () => apiClient.post('/auth/profile'),
};

export const teasApi = {
  getAll: (query?: string) => {
    const endpoint = query ? `/teas?q=${encodeURIComponent(query)}` : '/teas';
    return apiClient.get<Tea[]>(endpoint);
  },
  getById: (id: number) => apiClient.get<Tea>(`/teas/${id}`),
  create: (data: CreateTeaRequest) => apiClient.post<Tea>('/teas', data),
};

export const notesApi = {
  getActiveSchemas: () => apiClient.get('/notes/schemas/active'),
  getSchemaAxes: (schemaId: number) => apiClient.get(`/notes/schemas/${schemaId}/axes`),
  getAll: (userId?: number, isPublic?: boolean, teaId?: number, bookmarked?: boolean) => {
    const params = new URLSearchParams();
    if (userId !== undefined) params.append('userId', String(userId));
    if (isPublic !== undefined) params.append('public', String(isPublic));
    if (teaId !== undefined) params.append('teaId', String(teaId));
    if (bookmarked !== undefined) params.append('bookmarked', String(bookmarked));
    const query = params.toString();
    return apiClient.get(`/notes${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => apiClient.get(`/notes/${id}`),
  uploadImage: (file: File) => apiClient.uploadFile<{ url: string }>('/notes/images', file),
  create: (data: CreateNoteRequest) => apiClient.post('/notes', data),
  update: (id: number, data: UpdateNoteRequest) => apiClient.patch(`/notes/${id}`, data),
  delete: (id: number) => apiClient.delete(`/notes/${id}`),
  toggleLike: (id: number) => apiClient.post<{ liked: boolean; likeCount: number }>(`/notes/${id}/like`),
  toggleBookmark: (id: number) => apiClient.post<{ bookmarked: boolean }>(`/notes/${id}/bookmark`),
};

export const usersApi = {
  getById: (id: number) => apiClient.get<User>(`/users/${id}`),
  uploadProfileImage: (file: File) => apiClient.uploadFile<{ url: string }>('/users/profile-image', file),
  updateProfile: (id: number, data: { profileImageUrl?: string | null }) => apiClient.patch<User>(`/users/${id}`, data),
};

