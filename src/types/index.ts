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

export interface Note {
  id: number;
  teaId: number;
  teaName: string;
  userId: number;
  userName: string;
  rating: number;
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };
  memo: string | null;
  images?: string[] | null;
  tags?: string[] | null;
  isPublic: boolean;
  createdAt: Date;
  likeCount?: number;
  isLiked?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string | null;
}
