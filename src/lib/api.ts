import { API_TIMEOUT } from '../constants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
  id: string;
  teaId: string;
  tea?: { name: string };
  userId: string;
  user?: { name: string };
  rating: number;
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };
  memo: string;
  isPublic: boolean;
  createdAt: Date | string;
}

interface NormalizedNote {
  id: string;
  teaId: string;
  teaName: string;
  userId: string;
  userName: string;
  rating: number;
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };
  memo: string;
  isPublic: boolean;
  createdAt: Date;
}

/**
 * Note 응답을 프론트엔드 타입으로 정규화
 * 백엔드의 tea/user 객체에서 teaName/userName을 추출
 */
function normalizeNote(note: BackendNote): NormalizedNote {
  if (!note) {
    throw new Error('Note data is required');
  }
  
  return {
    ...note,
    teaName: note.tea?.name || '',
    userName: note.user?.name || '',
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

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<T> {
    const token = localStorage.getItem('access_token');
    const timeout = options.timeout ?? API_TIMEOUT;
    
    // timeout을 제거한 fetch 옵션 생성
    const { timeout: _, ...fetchOptions } = options;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    // AbortController를 사용한 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
          statusCode: response.status,
        }));
        
        // 에러 메시지를 한글로 변환
        let errorMessage = error.message || `HTTP error! status: ${response.status}`;
        
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
        } else if (response.status === 500) {
          if (!errorMessage.match(/[가-힣]/)) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          }
        }
        
        throw new Error(errorMessage);
      }

      // 204 No Content 응답 처리
      if (response.status === 204) {
        return null as T;
      }

      const data = await response.json();
      // 날짜 문자열을 Date 객체로 자동 변환
      const parsedData = parseDates(data);
      
      // Note 관련 응답인 경우 정규화 (tea/user 객체에서 teaName/userName 추출)
      const isNoteEndpoint = endpoint.startsWith('/notes');
      if (isNoteEndpoint) {
        return normalizeNotes(parsedData as BackendNote | BackendNote[]) as T;
      }
      
      return parsedData as T;
    } catch (error) {
      // AbortError 처리 (타임아웃)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`요청 시간이 초과되었습니다 (${timeout}ms)`);
      }
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    } finally {
      // fetch가 완료되면 타임아웃 클리어
      clearTimeout(timeoutId);
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

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
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
  teaId: string;
  rating: number;
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };
  memo: string;
  isPublic: boolean;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {}

// API 함수들
export const authApi = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<AuthResponse>('/auth/register', data),
  getProfile: () => apiClient.post('/auth/profile'),
};

export const teasApi = {
  getAll: (query?: string) => {
    const endpoint = query ? `/teas?q=${encodeURIComponent(query)}` : '/teas';
    return apiClient.get(endpoint);
  },
  getById: (id: string) => apiClient.get(`/teas/${id}`),
  create: (data: CreateTeaRequest) => apiClient.post('/teas', data),
};

export const notesApi = {
  getAll: (userId?: string, isPublic?: boolean, teaId?: string) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (isPublic !== undefined) params.append('public', String(isPublic));
    if (teaId) params.append('teaId', teaId);
    const query = params.toString();
    return apiClient.get(`/notes${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiClient.get(`/notes/${id}`),
  create: (data: CreateNoteRequest) => apiClient.post('/notes', data),
  update: (id: string, data: UpdateNoteRequest) => apiClient.patch(`/notes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/notes/${id}`),
};

