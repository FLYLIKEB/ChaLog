export class TagDetailDto {
  name: string;
  noteCount: number;
  isFollowing: boolean;
  followerCount: number;
}

export class TagNoteDto {
  id: number;
  teaId: number;
  teaName: string;
  teaType: string | null;
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

export class TagNoteListDto {
  tag: TagDetailDto;
  notes: TagNoteDto[];
  total: number;
  page: number;
  limit: number;
}

export class PopularTagDto {
  name: string;
  noteCount: number;
  isFollowing?: boolean;
}
