import { Post, PostCategory } from '../../types';
import { apiClient } from './client';
import { ReportReason } from './users.api';

export interface PostImageItemRequest {
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  category: PostCategory;
  isAnonymous?: boolean;
  isPinned?: boolean;
  isSponsored?: boolean;
  sponsorNote?: string;
  images?: PostImageItemRequest[];
  taggedNoteIds?: number[];
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {}

export type PostSort = 'latest' | 'popular' | 'commented';

export const postsApi = {
  uploadImage: (file: File) =>
    apiClient.uploadFile<{ url: string; thumbnailUrl: string }>('/posts/images', file),
  getAll: (
    category?: PostCategory | PostCategory[],
    page = 1,
    limit = 20,
    sort?: PostSort,
    bookmarked?: boolean,
  ) => {
    const params = new URLSearchParams();
    if (Array.isArray(category) && category.length > 0) {
      params.append('categories', category.join(','));
    } else if (category && !Array.isArray(category)) {
      params.append('category', category);
    }
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (sort && sort !== 'latest') params.append('sort', sort);
    if (bookmarked) params.append('bookmarked', 'true');
    return apiClient.get<Post[]>(`/posts?${params.toString()}`);
  },
  getById: (id: number) => apiClient.get<Post>(`/posts/${id}`),
  create: (data: CreatePostRequest) => apiClient.post<Post>('/posts', data),
  update: (id: number, data: UpdatePostRequest) => apiClient.patch<Post>(`/posts/${id}`, data),
  delete: (id: number) => apiClient.delete(`/posts/${id}`),
  toggleLike: (id: number) => apiClient.post<{ liked: boolean; likeCount: number }>(`/posts/${id}/like`),
  toggleBookmark: (id: number) => apiClient.post<{ bookmarked: boolean }>(`/posts/${id}/bookmark`),
  report: (id: number, reason: ReportReason) =>
    apiClient.post<{ id: number; message: string }>(`/posts/${id}/report`, { reason }),
};
