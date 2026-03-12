// Core client
export { apiClient } from './client';
export type { ApiError, BackendNote, NormalizedNote } from './client';

// Auth
export { authApi } from './auth.api';
export type { LoginRequest, RegisterRequest, KakaoLoginRequest, GoogleLoginRequest, AuthResponse } from './auth.api';

// Teas
export { teasApi } from './teas.api';
export type { CreateTeaRequest, UpdateTeaRequest, CreateSellerRequest, UpdateSellerRequest } from './teas.api';

// Notes
export { notesApi } from './notes.api';
export type { CreateNoteRequest, UpdateNoteRequest, CreateRatingSchemaRequest, ActiveSchemasResponse } from './notes.api';

// Users & Follows
export { usersApi, followsApi, REPORT_REASONS } from './users.api';
export type { UpdateUserRequest, UserNotificationSetting, LinkedAccount, ReportReason } from './users.api';

// Sessions (Tea Sessions, Blind Sessions, Cellar)
export { cellarApi, teaSessionsApi, blindSessionsApi } from './sessions.api';
export type {
  CreateCellarItemRequest,
  UpdateCellarItemRequest,
  CreateTeaSessionRequest,
  CreateSessionSteepRequest,
  PublishSessionToNoteRequest,
  CreateBlindSessionRequest,
  SubmitBlindNoteRequest,
  BlindSessionSummary,
} from './sessions.api';

// Posts
export { postsApi } from './posts.api';
export type { PostImageItemRequest, CreatePostRequest, UpdatePostRequest, PostSort } from './posts.api';

// Social (Tags, Comments, Notifications)
export { tagsApi, commentsApi, notificationsApi } from './social.api';

// Admin
export { adminApi } from './admin.api';
