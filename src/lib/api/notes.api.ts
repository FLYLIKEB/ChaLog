import { RatingSchema } from '../../types';
import { apiClient } from './client';
import { ReportReason } from './users.api';

export interface CreateRatingSchemaRequest {
  nameKo: string;
  descriptionKo?: string;
  nameEn?: string;
  descriptionEn?: string;
  axes: Array<{
    nameKo: string;
    nameEn: string;
    descriptionKo?: string;
    descriptionEn?: string;
    minValue?: number;
    maxValue?: number;
    stepValue?: number;
    displayOrder?: number;
  }>;
}

export interface ActiveSchemasResponse {
  schemas: RatingSchema[];
  pinnedSchemaIds: number[];
}

export interface CreateNoteRequest {
  teaId: number;
  /** 다중 스키마 (권장) - schemaId보다 우선 */
  schemaIds?: number[];
  /** 단일 스키마 (하위 호환) - schemaIds가 있으면 무시됨 */
  schemaId?: number;
  overallRating?: number | null;
  isRatingIncluded?: boolean;
  axisValues: Array<{
    axisId: number;
    value: number;
  }>;
  memo?: string | null;
  images?: string[] | null;
  imageThumbnails?: string[] | null;
  tags?: string[];
  isPublic: boolean;
}

export interface UpdateNoteRequest extends Partial<CreateNoteRequest> {}

export interface CalendarData {
  dates: string[];
  streak: { current: number; longest: number };
}

export const notesApi = {
  getActiveSchemas: () => apiClient.get<ActiveSchemasResponse>('/notes/schemas/active'),
  getSchemaAxes: (schemaId: number) => apiClient.get(`/notes/schemas/${schemaId}/axes`),
  createSchema: (data: CreateRatingSchemaRequest) =>
    apiClient.post<RatingSchema>('/notes/schemas', data),
  toggleSchemaPin: (schemaId: number) =>
    apiClient.post<{ pinned: boolean }>(`/notes/schemas/${schemaId}/pin`),
  getAll: (userId?: number, isPublic?: boolean, teaId?: number, bookmarked?: boolean, feed?: 'following' | 'tags', sort?: 'latest' | 'rating', page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (userId !== undefined) params.append('userId', String(userId));
    if (isPublic !== undefined) params.append('public', String(isPublic));
    if (teaId !== undefined) params.append('teaId', String(teaId));
    if (bookmarked !== undefined) params.append('bookmarked', String(bookmarked));
    if (feed !== undefined) params.append('feed', feed);
    if (sort !== undefined) params.append('sort', sort);
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));
    const query = params.toString();
    return apiClient.get(`/notes${query ? `?${query}` : ''}`);
  },
  getById: (id: number) => apiClient.get(`/notes/${id}`),
  uploadImage: (file: File) => apiClient.uploadFile<{ url: string; thumbnailUrl: string }>('/notes/images', file),
  create: (data: CreateNoteRequest) => apiClient.post('/notes', data),
  update: (id: number, data: UpdateNoteRequest) => apiClient.patch(`/notes/${id}`, data),
  delete: (id: number) => apiClient.delete(`/notes/${id}`),
  toggleLike: (id: number) => apiClient.post<{ liked: boolean; likeCount: number }>(`/notes/${id}/like`),
  toggleBookmark: (id: number) => apiClient.post<{ bookmarked: boolean }>(`/notes/${id}/bookmark`),
  report: (id: number, reason: ReportReason) => apiClient.post<{ id: number; message: string }>(`/notes/${id}/report`, { reason }),
  getCalendar: (userId: number, year: number, month: number) =>
    apiClient.get<CalendarData>(`/notes/calendar?userId=${userId}&year=${year}&month=${month}`),
};
