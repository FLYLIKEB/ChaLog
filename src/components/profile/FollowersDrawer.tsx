import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { User } from '@/types';
import { followsApi } from '@/lib/api';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { logger } from '@/lib/logger';
import { cn } from '@/components/ui/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type Tab = 'followers' | 'following';

interface FollowersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  followerCount: number;
  followingCount: number;
  initialTab?: Tab;
}

export function FollowersDrawer({
  open,
  onOpenChange,
  userId,
  followerCount,
  followingCount,
  initialTab = 'followers',
}: FollowersDrawerProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setIsLoading(true);
    Promise.all([
      followsApi.getFollowers(userId),
      followsApi.getFollowing(userId),
    ])
      .then(([f, ing]) => {
        setFollowers(f);
        setFollowing(ing);
      })
      .catch((err) => { logger.error('Failed to fetch follow lists:', err); })
      .finally(() => setIsLoading(false));
  }, [open, userId, initialTab]);

  const handleUserClick = (id: number) => {
    onOpenChange(false);
    navigate(`/user/${id}`);
  };

  const list = tab === 'followers' ? followers : following;
  const emptyText = tab === 'followers' ? '아직 구독자가 없어요.' : '아직 구독 중인 사람이 없어요.';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl px-0 flex flex-col">
        <SheetHeader className="px-4 pt-2 pb-0 sr-only">
          <SheetTitle>구독자 / 구독 중</SheetTitle>
        </SheetHeader>

        {/* Tab bar */}
        <div className="flex border-b border-border/40 shrink-0">
          {([
            { key: 'followers' as Tab, label: '구독자', count: followerCount },
            { key: 'following' as Tab, label: '구독 중', count: followingCount },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground/70',
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  'ml-1.5 text-xs',
                  tab === key ? 'text-foreground' : 'text-muted-foreground',
                )}>
                  {count.toLocaleString('ko-KR')}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 pb-20">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">{emptyText}</p>
          ) : (
            <ul>
              {list.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => handleUserClick(u.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  >
                    <UserAvatar name={u.name} profileImageUrl={u.profileImageUrl} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      {u.bio && (
                        <p className="text-xs text-muted-foreground truncate">{u.bio}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
