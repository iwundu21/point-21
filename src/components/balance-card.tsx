
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDisplayName, TelegramUser } from '@/lib/user-utils';

interface BalanceCardProps {
  balance: number;
  user: TelegramUser | null;
}

const BalanceCard: FC<BalanceCardProps> = ({ balance, user }) => {
  const displayName = getDisplayName(user);

  return (
    <Card className="w-full glass-card">
      <CardHeader className="p-2 flex flex-row justify-between items-center">
        <span className="text-xs text-muted-foreground">{displayName}</span>
        <CardTitle className="text-center text-muted-foreground font-normal text-sm">Total Balance</CardTitle>
        <div className="w-16"></div>
      </CardHeader>
      <CardContent className="flex items-center justify-center space-x-2 p-2 pt-0">
        <div className="relative">
          <span className="text-2xl sm:text-3xl font-normal tracking-tight text-gold">
            {balance.toLocaleString()} EXN
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
