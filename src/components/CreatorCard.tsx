import React, { type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserAvatar } from './ui/UserAvatar';
import { Card } from './ui/card';
import { Users } from 'lucide-react';

export interface CreatorCardProps {
  user: {
    id: number;
    name: string;
    profileImageUrl?: string | null;
  };
  followerCount: number;
}

export const CreatorCard: FC<CreatorCardProps> = ({ user, followerCount }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/user/${user.id}`)}
      className="w-full text-left p-4 hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3"
    >
      <UserAvatar
        name={user.name}
        profileImageUrl={user.profileImageUrl}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-medium text-foreground">{user.name}</h3>
        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
          <Users className="w-4 h-4 shrink-0" />
          <span>팔로워 {followerCount}명</span>
        </div>
      </div>
    </Card>
  );
};
