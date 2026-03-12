import { apiClient } from './client';
import { UpdateUserRequest } from './users.api';
import { CreateTeaRequest, CreateSellerRequest } from './teas.api';

export const adminApi = {
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getMetrics: () => apiClient.get('/admin/metrics'),
  getLogs: (params?: { level?: 'error' | 'warn' | 'all'; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.level) search.set('level', params.level);
    if (params?.limit) search.set('limit', String(params.limit));
    return apiClient.get(`/admin/logs?${search.toString()}`);
  },
  getNoteReports: (params?: { page?: number; limit?: number; status?: string; reason?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.status) search.set('status', params.status);
    if (params?.reason) search.set('reason', params.reason);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/reports/notes?${search.toString()}`);
  },
  getPostReports: (params?: { page?: number; limit?: number; status?: string; reason?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.status) search.set('status', params.status);
    if (params?.reason) search.set('reason', params.reason);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/reports/posts?${search.toString()}`);
  },
  getNoteReportDetail: (id: number) => apiClient.get(`/admin/reports/notes/${id}`),
  getPostReportDetail: (id: number) => apiClient.get(`/admin/reports/posts/${id}`),
  dismissNoteReport: (id: number) => apiClient.post(`/admin/reports/notes/${id}/dismiss`),
  dismissPostReport: (id: number) => apiClient.post(`/admin/reports/posts/${id}/dismiss`),
  actionNoteReport: (id: number, reason?: string) => apiClient.post(`/admin/reports/notes/${id}/action`, { reason }),
  actionPostReport: (id: number, reason?: string) => apiClient.post(`/admin/reports/posts/${id}/action`, { reason }),
  getUsers: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.search) search.set('search', params.search);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/users?${search.toString()}`);
  },
  getUserDetail: (id: number) => apiClient.get(`/admin/users/${id}`),
  updateUser: (id: number, dto: UpdateUserRequest) =>
    apiClient.patch(`/admin/users/${id}`, dto),
  suspendUser: (id: number) => apiClient.post(`/admin/users/${id}/suspend`),
  promoteUser: (id: number) => apiClient.post(`/admin/users/${id}/promote`),
  deleteUser: (id: number) => apiClient.delete(`/admin/users/${id}`),
  getNotes: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.search) search.set('search', params.search);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/notes?${search.toString()}`);
  },
  getNoteDetail: (id: number) => apiClient.get(`/admin/notes/${id}`),
  deleteNote: (id: number) => apiClient.delete(`/admin/notes/${id}`),
  getPosts: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.search) search.set('search', params.search);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/posts?${search.toString()}`);
  },
  getPostDetail: (id: number) => apiClient.get(`/admin/posts/${id}`),
  togglePostPin: (id: number) => apiClient.patch<{ isPinned: boolean }>(`/admin/posts/${id}/pin`),
  deletePost: (id: number) => apiClient.delete(`/admin/posts/${id}`),
  getPostComments: (postId: number) => apiClient.get(`/admin/posts/${postId}/comments`),
  deleteComment: (id: number) => apiClient.delete(`/admin/comments/${id}`),
  getAuditLogs: (params?: { page?: number; limit?: number; adminId?: number }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.adminId) search.set('adminId', String(params.adminId));
    return apiClient.get(`/admin/audit-log?${search.toString()}`);
  },
  getTeas: (params?: { page?: number; limit?: number; search?: string; type?: string; seller?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.search) search.set('search', params.search);
    if (params?.type) search.set('type', params.type);
    if (params?.seller) search.set('seller', params.seller);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/teas?${search.toString()}`);
  },
  getTeaDetail: (id: number) => apiClient.get(`/admin/teas/${id}`),
  createTea: (dto: CreateTeaRequest) =>
    apiClient.post('/admin/teas', dto),
  updateTea: (id: number, dto: Record<string, unknown>) => apiClient.patch(`/admin/teas/${id}`, dto),
  deleteTea: (id: number) => apiClient.delete(`/admin/teas/${id}`),
  getSellers: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.search) search.set('search', params.search);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/sellers?${search.toString()}`);
  },
  getSellerDetail: (id: number) => apiClient.get(`/admin/sellers/${id}`),
  createSeller: (dto: CreateSellerRequest) =>
    apiClient.post('/admin/sellers', dto),
  updateSeller: (id: number, dto: Record<string, unknown>) => apiClient.patch(`/admin/sellers/${id}`, dto),
  deleteSeller: (id: number) => apiClient.delete(`/admin/sellers/${id}`),
  getTags: (params?: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set('page', String(params.page));
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.search) search.set('search', params.search);
    if (params?.sortBy) search.set('sortBy', params.sortBy);
    if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
    return apiClient.get(`/admin/tags?${search.toString()}`);
  },
  getTagDetail: (id: number) => apiClient.get(`/admin/tags/${id}`),
  createTag: (dto: { name: string }) => apiClient.post('/admin/tags', dto),
  updateTag: (id: number, dto: { name: string }) => apiClient.patch(`/admin/tags/${id}`, dto),
  deleteTag: (id: number) => apiClient.delete(`/admin/tags/${id}`),
  mergeTag: (id: number, targetTagId: number) => apiClient.post(`/admin/tags/${id}/merge`, { targetTagId }),
};
