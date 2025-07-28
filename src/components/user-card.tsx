'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Hash } from 'lucide-react';

interface UserCardProps {
  username: string;
  userId: string;
}

const UserCard: FC<UserCardProps> = ({ username, userId }) => {
  return (
    <Card className="w-full bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-primary">Operator Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <User className="w-6 h-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Username</span>
            <span className="font-semibold">{username}</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Hash className="w-6 h-6 text-primary" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Telegram ID</span>
            <span className="font-semibold">{userId}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
