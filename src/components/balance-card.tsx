
'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  balance: number;
  animating: boolean;
  miningReward: number;
}

const BalanceCard: FC<BalanceCardProps> = ({ balance, animating, miningReward }) => {
  return (
    <Card className="w-full glass-card">
      <CardHeader className="p-2">
        <CardTitle className="text-center text-muted-foreground font-normal text-sm">E-point</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center space-x-2 p-2">
        <Coins className="w-6 h-6 text-gold" />
        <div className="relative">
          <span className="text-2xl sm:text-3xl font-normal tracking-tight text-gold">
            {balance.toLocaleString()}
          </span>
          <span className={cn(
            "absolute -top-6 right-0 text-lg sm:text-xl font-medium text-gold transition-all duration-1000 ease-out",
            animating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          )}>
            +{miningReward}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
