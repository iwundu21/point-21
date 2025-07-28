
'use client';

import type { FC } from 'react';
import { User, Hash } from 'lucide-react';

interface UserCardProps {
  username: string;
  userId: string;
}

const UserCard: FC<UserCardProps> = ({ username, userId }) => {
  return (
    <div className="w-full p-4">
      <div className="flex items-center space-x-4">
        <User className="w-6 h-6 text-primary" />
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">Username</span>
          <span className="font-normal">{username}</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
