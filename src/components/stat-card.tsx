
'use client';
import type { FC, ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useRouter } from 'next/navigation';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string | number;
  progress?: number;
  isLink?: boolean;
}

const StatCard: FC<StatCardProps> = ({ icon, title, value, progress, isLink = false }) => {
  const router = useRouter();

  const handleClick = () => {
    if (isLink) {
      router.push('/leaderboard');
    }
  }

  const cardClasses = `bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center space-x-4 ${isLink ? 'cursor-pointer hover:bg-primary/20 transition-colors' : ''}`;

  return (
    <div className={cardClasses} onClick={handleClick}>
      <div className="flex-shrink-0">
          {icon}
      </div>
      <div className="flex-1 space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold text-primary/90">{value}</p>
          {progress !== undefined && <Progress value={progress} className="h-2 w-full bg-primary/20" />}
      </div>
    </div>
  );
};

export default StatCard;
