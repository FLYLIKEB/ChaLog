import { Tea, Seller, SellerDetail, PopularTag, Note, TeaFilterParams } from '../../types';
import { apiClient } from './client';

export interface CreateTeaRequest {
  name: string;
  year?: number;
  type: string;
  seller?: string;
  origin?: string;
  price?: number;
  weight?: number;
}

export interface UpdateTeaRequest {
  name?: string;
  year?: number;
  type?: string;
  seller?: string;
  origin?: string;
  price?: number;
  weight?: number;
}

export interface CreateSellerRequest {
  name: string;
  address?: string;
  mapUrl?: string;
  websiteUrl?: string;
  phone?: string;
  description?: string;
  businessHours?: string;
}

export interface UpdateSellerRequest {
  address?: string;
  mapUrl?: string;
  websiteUrl?: string;
  phone?: string;
  description?: string;
  businessHours?: string;
}

export const teasApi = {
  getAll: (query?: string) => {
    const endpoint = query ? `/teas?q=${encodeURIComponent(query)}` : '/teas';
    return apiClient.get<Tea[]>(endpoint);
  },
  getTrending: (period?: '7d' | '30d') =>
    apiClient.get<Tea[]>(`/teas/trending?period=${period || '7d'}`),
  getWithFilters: (params: TeaFilterParams) => {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.type) searchParams.set('type', params.type);
    if (params.minRating != null) searchParams.set('minRating', String(params.minRating));
    if (params.sort) searchParams.set('sort', params.sort);
    const query = searchParams.toString();
    return apiClient.get<Tea[]>(`/teas${query ? `?${query}` : ''}`);
  },
  getPopularRankings: (limit = 10) =>
    apiClient.get<Tea[]>(`/teas/rankings/popular?limit=${limit}`),
  getNewRankings: (limit = 10) =>
    apiClient.get<Tea[]>(`/teas/rankings/new?limit=${limit}`),
  getSellers: (query?: string) => {
    const params = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    return apiClient.get<{ sellers: Seller[] }>(`/teas/sellers${params}`);
  },
  createSeller: (data: CreateSellerRequest) =>
    apiClient.post<SellerDetail>('/teas/sellers', data),
  getSellerByName: (name: string) =>
    apiClient.get<SellerDetail | null>(`/teas/sellers/by-name/${encodeURIComponent(name)}`),
  updateSeller: (name: string, data: UpdateSellerRequest) =>
    apiClient.patch<SellerDetail>(`/teas/sellers/by-name/${encodeURIComponent(name)}`, data),
  getCuration: (limit = 10) =>
    apiClient.get<Tea[]>(`/teas/curation?limit=${limit}`),
  getBySeller: (name: string) =>
    apiClient.get<Tea[]>(`/teas/by-seller/${encodeURIComponent(name)}`),
  getById: (id: number) => apiClient.get<Tea>(`/teas/${id}`),
  create: (data: CreateTeaRequest) => apiClient.post<Tea>('/teas', data),
  update: (id: number, data: UpdateTeaRequest) => apiClient.patch<Tea>(`/teas/${id}`, data),
  getPopularTags: (id: number) =>
    apiClient.get<{ tags: PopularTag[] }>(`/teas/${id}/popular-tags`),
  getTopReviews: (id: number) =>
    apiClient.get<Note[]>(`/teas/${id}/top-reviews`),
  getSimilarTeas: (id: number) =>
    apiClient.get<Tea[]>(`/teas/${id}/similar`),
  getByTags: (
    tags: string[],
    sort?: 'match' | 'popular' | 'recent',
    limit?: number,
  ) => {
    const params = new URLSearchParams();
    if (tags.length > 0) params.set('tags', tags.join(','));
    if (sort) params.set('sort', sort);
    if (limit != null) params.set('limit', String(limit));
    const query = params.toString();
    return apiClient.get<Tea[]>(`/teas/by-tags${query ? `?${query}` : ''}`);
  },
  getSimilarTeasByTags: (id: number, limit?: number) => {
    const params = limit != null ? `?limit=${limit}` : '';
    return apiClient.get<Tea[]>(`/teas/${id}/similar-by-tags${params}`);
  },
  toggleWishlist: (id: number) =>
    apiClient.post<{ wishlisted: boolean }>(`/teas/${id}/wishlist`),
  isWishlisted: (id: number) =>
    apiClient.get<{ wishlisted: boolean }>(`/teas/${id}/wishlist`),
  getWishlisted: () => apiClient.get<Tea[]>('/teas/wishlist/me'),
};
