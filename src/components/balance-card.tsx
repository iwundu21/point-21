
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  balance: number;
}

const BalanceCard: FC<BalanceCardProps> = ({ balance }) => {
  return (
    <Card className="w-full glass-card">
      <CardHeader className="p-2">
        <CardTitle className="text-center text-muted-foreground font-normal text-sm">Total Balance</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center space-x-2 p-2">
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
