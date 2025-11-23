const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface ApiError {
  message: string;
  statusCode: number;
}

/**
 * ISO 날짜 문자열을 Date 객체로 변환하는 재귀적 유틸리티
 * 객체와 배열을 순회하며 모든 날짜 문자열을 Date 객체로 변환
 */
function parseDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // 배열인 경우 각 요소에 대해 재귀 호출
  if (Array.isArray(obj)) {
    return obj.map(parseDates);
  }

  // 객체인 경우
  if (typeof obj === 'object') {
    const parsed: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // createdAt, updatedAt 등 날짜 필드인 경우 Date로 변환
        if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
          const date = new Date(value);
          // 유효한 날짜인지 확인
          parsed[key] = isNaN(date.getTime()) ? value : date;
        } else {
          // 중첩된 객체나 배열인 경우 재귀 호출
          parsed[key] = parseDates(value);
        }
      }
    }
    return parsed;
  }

  return obj;
}

/**
 * Note 응답을 프론트엔드 타입으로 정규화
 * 백엔드의 tea/user 객체에서 teaName/userName을 추출
 */
function normalizeNote(note: any): any {
  if (!note) return note;
  
  return {
    ...note,
    teaName: note.tea?.name || '',
    userName: note.user?.name || '',
  };
}

/**
 * Note 배열 또는 단일 Note를 정규화
 */
function normalizeNotes(data: any): any {
  if (Array.isArray(data)) {
    return data.map(normalizeNote);
  }
  return normalizeNote(data);
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('access_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
          statusCode: response.status,
        }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      // 204 No Content 응답 처리
      if (response.status === 204) {
        return undefined as T;
      }

      const data = await response.json();
      // 날짜 문자열을 Date 객체로 자동 변환
      const parsedData = parseDates(data);
      
      // Note 관련 응답인 경우 정규화 (tea/user 객체에서 teaName/userName 추출)
      if (endpoint.includes('/notes')) {
        return normalizeNotes(parsedData) as T;
      }
      
      return parsedData as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
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

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
  getAll: (userId?: string, isPublic?: boolean) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (isPublic !== undefined) params.append('public', String(isPublic));
    const query = params.toString();
    return apiClient.get(`/notes${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiClient.get(`/notes/${id}`),
  create: (data: CreateNoteRequest) => apiClient.post('/notes', data),
  update: (id: string, data: UpdateNoteRequest) => apiClient.patch(`/notes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/notes/${id}`),
};

