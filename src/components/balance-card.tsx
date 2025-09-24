
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDisplayName, TelegramUser, getInitials } from '@/lib/user-utils';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface BalanceCardProps {
  balance: number;
  user: TelegramUser | null;
}

const BalanceCard: FC<BalanceCardProps> = ({ balance, user }) => {
  const displayName = getDisplayName(user);
  const avatarSrc = user?.photo_url;

  return (
    <Card className="w-full glass-card">
      <CardContent className="p-3 flex items-center space-x-4">
        <Avatar className="w-12 h-12 border-2 border-primary/50">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback>{getInitials(user)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <div className="relative">
            <span className="text-2xl sm:text-3xl font-normal tracking-tight text-gold">
              {balance.toLocaleString()} EXN
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
