
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
    <Card className="w-full bg-transparent backdrop-blur-sm border-0 shadow-none rounded-none">
      <CardHeader className="p-2">
        <CardTitle className="text-center text-primary/80 font-normal text-sm">E-point</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center space-x-2 p-2">
        <Coins className="w-6 h-6 text-primary/80" />
        <div className="relative">
          <span className="text-3xl font-normal tracking-tight">
            {balance.toLocaleString()}
          </span>
          <span className={cn(
            "absolute -top-6 right-0 text-xl font-medium text-primary transition-all duration-1000 ease-out",
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
