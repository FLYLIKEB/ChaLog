import { Camera, Globe, Instagram, Loader2, Pencil, Settings } from 'lucide-react';
import { User } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  isFollowLoading: boolean;
  noteCount: number;
  onFollowToggle: () => void;
  onEditImage: () => void;
  onEditProfile: () => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  isFollowLoading,
  noteCount,
  onFollowToggle,
  onEditImage,
  onEditProfile,
}: ProfileHeaderProps) {
  return (
    <div className="px-4 pt-2 pb-3">
      {/* Top row: Avatar + Stats */}
      <div className="flex items-center gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <UserAvatar
            name={user.name}
            profileImageUrl={user.profileImageUrl}
            size="xl"
          />
          {isOwnProfile && (
            <button
              onClick={onEditImage}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background shadow-sm"
              aria-label="프로필 사진 수정"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex-1 flex justify-around text-center">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">{noteCount}</span>
            <span className="text-xs text-muted-foreground">차록</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">
              {(user.followerCount ?? 0).toLocaleString('ko-KR')}
            </span>
            <span className="text-xs text-muted-foreground">구독자</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-foreground">
              {(user.followingCount ?? 0).toLocaleString('ko-KR')}
            </span>
            <span className="text-xs text-muted-foreground">구독</span>
          </div>
        </div>
      </div>

      {/* Name + Bio */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm text-foreground">{user.name}</span>
          {isOwnProfile && (
            <button
              onClick={onEditProfile}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="프로필 편집"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {(user.instagramUrl || user.blogUrl) && (
            <div className="flex items-center gap-1.5">
              {user.instagramUrl && (
                <a
                  href={user.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="인스타그램"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {user.blogUrl && (
                <a
                  href={user.blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="블로그"
                >
                  <Globe className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
        {user.bio && (
          <p className="text-sm text-foreground leading-snug">{user.bio}</p>
        )}
      </div>

      {/* Follow button for other profiles */}
      {!isOwnProfile && (
        <div className="mt-3">
          <Button
            onClick={onFollowToggle}
            disabled={isFollowLoading}
            variant={user.isFollowing ? 'secondary' : 'default'}
            size="sm"
            className="w-full h-8 text-sm font-semibold rounded-lg"
          >
            {isFollowLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : user.isFollowing ? (
              '구독 중'
            ) : (
              '구독'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
