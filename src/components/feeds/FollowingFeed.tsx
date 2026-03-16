import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NoteCard } from '../NoteCard';
import { EmptyState } from '../EmptyState';
import { Button } from '../ui/button';
import { UserAvatar } from '../ui/UserAvatar';
import { Note, User } from '../../types';
import { followsApi } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface FollowingFeedProps {
  notes: Note[];
  isLoading: boolean;
  isLoggedIn: boolean;
  authLoading: boolean;
}

export function FollowingFeed({ notes, isLoading, isLoggedIn, authLoading }: FollowingFeedProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [followingUsers, setFollowingUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!user) return;
    followsApi.getFollowing(user.id)
      .then((data) => setFollowingUsers(Array.isArray(data) ? data : []))
      .catch(() => setFollowingUsers([]));
  }, [user]);

  if (!isLoggedIn && !authLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">
          구독한 다우의 차록을 보려면 로그인이 필요합니다.
        </p>
        <Button size="sm" onClick={() => navigate('/login')}>
          로그인하기
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Story-style following avatars */}
      {followingUsers.length > 0 && (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 mb-3 border-b border-border/30 -mx-1 px-1">
          {followingUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => navigate(`/user/${u.id}`)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden bg-background flex items-center justify-center">
                  {u.profileImageUrl ? (
                    <img src={u.profileImageUrl} alt={u.name} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-sm font-semibold text-primary">
                      {(u.name?.charAt(0) || '?').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium max-w-14 truncate">
                {u.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Notes grid */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 md:gap-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <EmptyState
          type="feed"
          message="구독한 다우의 차록이 없어요. 다우를 구독해 보세요!"
          action={{ label: '탐색하기', onClick: () => navigate('/sasaek') }}
        />
      )}
    </div>
  );
}
