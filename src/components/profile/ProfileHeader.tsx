import { Camera, Globe, Instagram, Loader2, Pencil } from 'lucide-react';
import { User } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile: boolean;
  isFollowLoading: boolean;
  onFollowToggle: () => void;
  onEditImage: () => void;
  onEditProfile: () => void;
}

export function ProfileHeader({
  user,
  isOwnProfile,
  isFollowLoading,
  onFollowToggle,
  onEditImage,
  onEditProfile,
}: ProfileHeaderProps) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative shrink-0">
          <UserAvatar
            name={user.name}
            profileImageUrl={user.profileImageUrl}
            size="md"
          />
          {isOwnProfile && (
            <Button
              onClick={onEditImage}
              size="icon"
              className="absolute bottom-0 right-0 rounded-full min-w-[44px] min-h-[44px] w-11 h-11 bg-primary hover:bg-primary/90 shadow-md border-2 border-background"
              aria-label="프로필 사진 수정"
            >
              <Camera className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-primary">{user.name}</h2>
            {isOwnProfile && (
              <Button
                onClick={onEditProfile}
                size="icon"
                variant="ghost"
                className="w-7 h-7 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="프로필 편집"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {user.bio && (
            <p className="text-sm text-muted-foreground max-w-xs leading-snug">{user.bio}</p>
          )}

          {(user.instagramUrl || user.blogUrl) && (
            <div className="flex items-center gap-2">
              {user.instagramUrl && (
                <a
                  href={user.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="블로그"
                >
                  <Globe className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>구독자 {(user.followerCount ?? 0).toLocaleString('ko-KR')}</span>
            <span>구독 {(user.followingCount ?? 0).toLocaleString('ko-KR')}</span>
          </div>

          {!isOwnProfile && (
            <Button
              onClick={onFollowToggle}
              disabled={isFollowLoading}
              variant={user.isFollowing ? 'outline' : 'default'}
              size="sm"
              className="mt-1 min-w-[88px]"
            >
              {isFollowLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : user.isFollowing ? (
                '구독 중'
              ) : (
                '구독'
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
