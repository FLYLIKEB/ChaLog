import { CellarItem, TeaSession, TeaSessionSteep, SteepDataV1 } from '../../types';
import { apiClient } from './client';

export interface CreateCellarItemRequest {
  teaId: number;
  quantity?: number;
  unit?: 'g' | 'ml' | 'bag' | 'cake';
  openedAt?: string | null;
  remindAt?: string | null;
  memo?: string | null;
}

export interface UpdateCellarItemRequest extends Partial<CreateCellarItemRequest> {}

export interface CreateTeaSessionRequest {
  teaId: number;
}

export interface CreateSessionSteepRequest {
  steepNumber: number;
  steepDurationSeconds: number;
  data?: SteepDataV1 | null;
}

export interface PublishSessionToNoteRequest {
  schemaId: number;
  overallRating?: number | null;
  isRatingIncluded?: boolean;
  axisValues: Array<{ axisId: number; value: number }>;
  memo?: string | null;
  tags?: string[];
  isPublic: boolean;
}

export interface CreateBlindSessionRequest {
  teaIds: number[];
}

export interface SubmitBlindNoteRequest {
  roundId: number;
  schemaId?: number;
  schemaIds?: number[];
  overallRating?: number | null;
  isRatingIncluded?: boolean;
  axisValues: Array<{ axisId: number; value: number }>;
  appearance?: string | null;
  memo?: string | null;
  images?: string[] | null;
  imageThumbnails?: string[] | null;
  tags?: string[];
}

export interface BlindSessionSummary {
  id: number;
  status: string;
  createdAt: string;
  endedAt: string | null;
  teaName: string | null;
  teaType: string | null;
  hostName: string;
  participantCount: number;
  isHost: boolean;
}

export const cellarApi = {
  getAll: () => apiClient.get<CellarItem[]>('/cellar'),
  getById: (id: number) => apiClient.get<CellarItem>(`/cellar/${id}`),
  getReminders: () => apiClient.get<CellarItem[]>('/cellar/reminders'),
  create: (data: CreateCellarItemRequest) => apiClient.post<CellarItem>('/cellar', data),
  update: (id: number, data: UpdateCellarItemRequest) => apiClient.patch<CellarItem>(`/cellar/${id}`, data),
  remove: (id: number) => apiClient.delete(`/cellar/${id}`),
};

export const teaSessionsApi = {
  create: (data: CreateTeaSessionRequest) =>
    apiClient.post<TeaSession>('/tea-sessions', data),
  getAll: (params?: { teaId?: number; from?: string; to?: string }) => {
    const search = new URLSearchParams();
    if (params?.teaId !== undefined) search.set('teaId', String(params.teaId));
    if (params?.from) search.set('from', params.from);
    if (params?.to) search.set('to', params.to);
    const query = search.toString();
    return apiClient.get<TeaSession[]>(`/tea-sessions${query ? `?${query}` : ''}`);
  },
  getById: (id: number) =>
    apiClient.get<TeaSession>(`/tea-sessions/${id}`),
  addSteep: (sessionId: number, data: CreateSessionSteepRequest) =>
    apiClient.post<TeaSessionSteep>(`/tea-sessions/${sessionId}/steeps`, data),
  updateSteep: (sessionId: number, steepId: number, data: Partial<CreateSessionSteepRequest>) =>
    apiClient.patch<TeaSessionSteep>(`/tea-sessions/${sessionId}/steeps/${steepId}`, data),
  deleteSteep: (sessionId: number, steepId: number) =>
    apiClient.delete(`/tea-sessions/${sessionId}/steeps/${steepId}`),
  publish: (sessionId: number, data: PublishSessionToNoteRequest) =>
    apiClient.post<{ noteId: number }>(`/tea-sessions/${sessionId}/publish`, data),
};

export const blindSessionsApi = {
  create: (data: CreateBlindSessionRequest) =>
    apiClient.post<{ id: number; inviteCode: string; status: string; rounds: Array<{ id: number; roundOrder: number; status: string }> }>('/blind-sessions', data),
  getByInviteCode: (inviteCode: string) =>
    apiClient.get<{ id: number; inviteCode: string; status: string; hostName: string; participantCount: number; hostId: number }>(
      `/blind-sessions/join/${encodeURIComponent(inviteCode)}`,
    ),
  join: (inviteCode: string) =>
    apiClient.post<{ id: number; sessionId: number; userId: number }>('/blind-sessions/join', { inviteCode }),
  getById: (id: number) =>
    apiClient.get<{
      id: number;
      inviteCode: string;
      status: string;
      hostName: string;
      participantCount: number;
      isHost: boolean;
      totalRounds: number;
      currentRoundOrder: number | null;
      currentRoundId: number | null;
      participants: Array<{ userId: number; userName: string; hasNote: boolean; completedRounds: number[] }>;
      rounds: Array<{ id: number; roundOrder: number; status: string; tea?: { id: number; name: string; type: string; year?: number } | null }>;
      myCompletedRounds: number[];
      tea?: { id: number; name: string; type: string; year?: number } | null;
    }>(`/blind-sessions/${id}`),
  getRounds: (sessionId: number) =>
    apiClient.get<Array<{ id: number; roundOrder: number; status: string; tea?: { id: number; name: string; type: string; year?: number } | null }>>(`/blind-sessions/${sessionId}/rounds`),
  nextRound: (sessionId: number) =>
    apiClient.post<{ completedRound: { id: number; roundOrder: number }; currentRound: { id: number; roundOrder: number; status: string } | null; isLastRound: boolean }>(`/blind-sessions/${sessionId}/next-round`, {}),
  submitNote: (sessionId: number, data: SubmitBlindNoteRequest) =>
    apiClient.post<{ noteId: number }>(`/blind-sessions/${sessionId}/notes`, data),
  endSession: (sessionId: number) =>
    apiClient.post<{ id: number; status: string }>(`/blind-sessions/${sessionId}/end`, {}),
  getReport: (sessionId: number) =>
    apiClient.get<{
      rounds: Array<{
        roundId: number;
        roundOrder: number;
        tea: { id: number; name: string; type: string; year?: number } | null;
        participants: Array<{
          userId: number;
          userName: string;
          overallRating: number | null;
          axisValues: Array<{ axisId: number; valueNumeric: number; axis?: { nameKo: string } }>;
          tags: string[];
          memo: string | null;
        }>;
        stats: {
          avgOverallRating: number | null;
          axisAverages: Array<{ axisName: string; avg: number; count: number }>;
          tagDistribution: Array<{ name: string; count: number }>;
        };
      }>;
    }>(`/blind-sessions/${sessionId}/report`),
  getMySessions: () =>
    apiClient.get<BlindSessionSummary[]>('/blind-sessions/my'),
};
