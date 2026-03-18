import { apiClient } from './client';
import { Teaware } from '../../types';

export interface CreateTeawareRequest {
  name: string;
  category: string;
  capacity?: number | null;
  material?: string | null;
  memo?: string | null;
}

export interface UpdateTeawareRequest extends Partial<CreateTeawareRequest> {}

export const teawareApi = {
  getAll: () => apiClient.get<Teaware[]>('/teaware'),
  getOne: (id: number) => apiClient.get<Teaware>(`/teaware/${id}`),
  create: (data: CreateTeawareRequest) => apiClient.post<Teaware>('/teaware', data),
  update: (id: number, data: UpdateTeawareRequest) =>
    apiClient.patch<Teaware>(`/teaware/${id}`, data),
  remove: (id: number) => apiClient.delete<Teaware>(`/teaware/${id}`),
  togglePin: (id: number) => apiClient.patch<Teaware>(`/teaware/${id}/pin`, {}),
};
