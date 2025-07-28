'use client';

import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  balance: number;
  animating: boolean;
}

const BalanceCard: FC<BalanceCardProps> = ({ balance, animating }) => {
  return (
    <Card className="w-full bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-primary">Your Balance</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center space-x-4">
        <Coins className="w-8 h-8 text-primary" />
        <div className="relative">
          <span className="text-4xl font-bold tracking-tighter">
            {balance.toLocaleString()}
          </span>
          <span className={cn(
            "absolute -top-8 right-0 text-2xl font-bold text-primary transition-all duration-1000 ease-out",
            animating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          )}>
            +1000
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceCard;
