export interface PopularTag {
  name: string;
  count: number;
}

export interface Tea {
  id: number;
  name: string;
  year?: number;
  type: string;
  seller?: string;
  origin?: string;
  averageRating: number;
  reviewCount: number;
}

export interface Seller {
  name: string;
  teaCount: number;
}

export interface TeaFilterParams {
  q?: string;
  type?: string;
  minRating?: number;
  sort?: 'popular' | 'new' | 'rating';
}

export interface RatingSchema {
  id: number;
  code: string;
  version: string;
  nameKo: string;
  nameEn: string;
  descriptionKo?: string | null;
  descriptionEn?: string | null;
  overallMinValue: number;
  overallMaxValue: number;
  overallStep: number;
  isActive: boolean;
}

export interface RatingAxis {
  id: number;
  schemaId: number;
  code: string;
  nameKo: string;
  nameEn: string;
  descriptionKo?: string | null;
  descriptionEn?: string | null;
  minValue: number;
  maxValue: number;
  stepValue: number;
  displayOrder: number;
  isRequired: boolean;
  teaType?: string | null;
}

export interface AxisValue {
  axisId: number;
  value: number;
}

export interface Note {
  id: number;
  teaId: number;
  teaName: string;
  userId: number;
  userName: string;
  schemaId: number;
  schema?: RatingSchema;
  overallRating: number | null;
  isRatingIncluded: boolean;
  axisValues?: Array<{
    axisId: number;
    valueNumeric: number;
    axis?: RatingAxis;
  }>;
  memo: string | null;
  images?: string[] | null;
  imageThumbnails?: string[] | null;
  tags?: string[] | null;
  isPublic: boolean;
  createdAt: Date;
  likeCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string | null;
  profileImageUrl?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  blogUrl?: string | null;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
}

export interface UserOnboardingPreference {
  preferredTeaTypes: string[];
  preferredFlavorTags: string[];
  hasCompletedOnboarding: boolean;
}

export interface CellarItem {
  id: number;
  teaId: number;
  tea: Tea;
  quantity: number;
  unit: 'g' | 'ml' | 'bag' | 'cake';
  openedAt: string | null;
  remindAt: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PostCategory = 'brewing_question' | 'recommendation' | 'tool' | 'tea_room_review';

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  brewing_question: '우림 질문',
  recommendation: '추천',
  tool: '도구',
  tea_room_review: '찻집 후기',
};

export interface Post {
  id: number;
  userId: number;
  user: Pick<User, 'id' | 'name' | 'profileImageUrl'>;
  title: string;
  content: string;
  category: PostCategory;
  isSponsored: boolean;
  sponsorNote: string | null;
  viewCount: number;
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagDetail {
  name: string;
  noteCount: number;
  isFollowing: boolean;
  followerCount: number;
}

export interface PopularTagItem {
  name: string;
  noteCount: number;
  isFollowing?: boolean;
}

export interface TagNoteItem {
  id: number;
  teaId: number;
  teaName: string;
  teaImageUrl: string | null;
  userId: number;
  userName: string;
  userProfileImageUrl: string | null;
  overallRating: number | null;
  memo: string | null;
  tags: string[];
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: Date;
}

export interface TagNoteList {
  tag: TagDetail;
  notes: TagNoteItem[];
  total: number;
  page: number;
  limit: number;
}

export interface Comment {
  id: number;
  postId: number;
  userId: number;
  user: Pick<User, 'id' | 'name' | 'profileImageUrl'>;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationType = 'note_like' | 'follow';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  actorId: number;
  actor: Pick<User, 'id' | 'name' | 'profileImageUrl'>;
  targetId: number | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
}
