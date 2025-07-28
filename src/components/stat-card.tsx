
'use client';
import type { FC, ReactNode } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StatCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  progress?: number;
}

const StatCard: FC<StatCardProps> = ({ icon, title, value, progress }) => (
  <Card className="bg-primary/10 border-primary/20 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-2">
    {icon}
    <p className="text-sm text-muted-foreground">{title}</p>
    <p className="text-lg font-bold text-primary/90">{value}</p>
    {progress !== undefined && <Progress value={progress} className="h-2 w-full bg-primary/20" />}
  </Card>
);

export default StatCard;
