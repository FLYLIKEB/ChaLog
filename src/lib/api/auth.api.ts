import { apiClient } from './client';

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

export interface GoogleLoginRequest {
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

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => apiClient.post<AuthResponse>('/auth/register', data),
  loginWithKakao: (data: KakaoLoginRequest) => apiClient.post<AuthResponse>('/auth/kakao', data),
  loginWithGoogle: (data: GoogleLoginRequest) => apiClient.post<AuthResponse>('/auth/google', data),
  getMe: () => apiClient.get<{ user: { id: number; email: string | null; name: string; role?: 'user' | 'admin' } }>('/auth/me'),
  logout: () => apiClient.post<void>('/auth/logout'),
  getProfile: () => apiClient.post('/auth/profile'),
  linkKakao: (accessToken: string) =>
    apiClient.post<null>('/auth/link/kakao', { accessToken }),
  linkGoogle: (accessToken: string) =>
    apiClient.post<null>('/auth/link/google', { accessToken }),
  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword }),
  findEmail: (name: string) =>
    apiClient.post<{ maskedEmail: string | null; message: string }>('/auth/find-email', { name }),
};
