import { User, UserOnboardingPreference } from '../../types';
import { apiClient } from './client';

export const REPORT_REASONS = [
  { value: 'spam', label: '스팸' },
  { value: 'inappropriate', label: '부적절한 내용' },
  { value: 'copyright', label: '저작권 침해' },
  { value: 'other', label: '기타' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export interface UserNotificationSetting {
  userId: number;
  isNotificationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedAccount {
  id: number;
  provider: 'email' | 'kakao' | 'google' | 'naver' | 'apple';
  providerId: string;
  hasCredential: boolean;
}

export type UpdateUserRequest = {
  name?: string;
  profileImageUrl?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  blogUrl?: string | null;
  isProfilePublic?: boolean;
};

export const usersApi = {
  getTrending: (period?: '7d' | '30d') =>
    apiClient.get<Array<User & { followerCount: number }>>(`/users/trending?period=${period || '7d'}`),
  getById: (id: number) => apiClient.get<User>(`/users/${id}`),
  getLinkedAccounts: (id: number) =>
    apiClient.get<LinkedAccount[]>(`/users/${id}/authentications`),
  unlinkAccount: (userId: number, authId: number) =>
    apiClient.delete(`/users/${userId}/authentications/${authId}`),
  uploadProfileImage: (file: File) => apiClient.uploadFile<{ url: string }>('/users/profile-image', file),
  updateProfile: (id: number, data: UpdateUserRequest) => apiClient.patch<User>(`/users/${id}`, data),
  getOnboardingPreference: (id: number) => apiClient.get<UserOnboardingPreference>(`/users/${id}/onboarding`),
  updateOnboardingPreference: (
    id: number,
    data: { preferredTeaTypes: string[]; preferredFlavorTags: string[] },
  ) => apiClient.patch<UserOnboardingPreference>(`/users/${id}/onboarding`, data),
  getLevel: (id: number) => apiClient.get(`/users/${id}/level`),
  getNotificationSetting: (id: number) =>
    apiClient.get<UserNotificationSetting>(`/users/${id}/notification-settings`),
  updateNotificationSetting: (id: number, isNotificationEnabled: boolean) =>
    apiClient.patch<UserNotificationSetting>(`/users/${id}/notification-settings`, {
      isNotificationEnabled,
    }),
};

export const followsApi = {
  toggle: (userId: number) =>
    apiClient.post<{ isFollowing: boolean }>(`/users/${userId}/follow`),
  getFollowers: (userId: number) =>
    apiClient.get<User[]>(`/users/${userId}/followers`),
  getFollowing: (userId: number) =>
    apiClient.get<User[]>(`/users/${userId}/following`),
};
