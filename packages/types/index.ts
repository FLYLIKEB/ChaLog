export interface Tea {
  id: string;
  name: string;
  year?: number;
  type: string;
  seller?: string;
  origin?: string;
  averageRating: number;
  reviewCount: number;
}

export interface Note {
  id: string;
  teaId: string;
  teaName: string;
  userId: string;
  userName: string;
  rating: number;
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };
  memo: string;
  isPublic: boolean;
  createdAt: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

