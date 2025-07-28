
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, Zap, Crown, Flame } from 'lucide-react';
import StatCard from './stat-card';
import DailyStreak from './daily-streak';

const MissionsCard = () => (
  <Card className="w-full max-w-sm bg-card/50 backdrop-blur-sm border-primary/10 shadow-lg rounded-xl">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-primary/90">Missions & Stats</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <DailyStreak />
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<Crown className="w-8 h-8 text-yellow-400" />}
          title="Rank"
          value="Gold III"
          progress={65}
        />
        <StatCard
          icon={<Users className="w-8 h-8 text-blue-400" />}
          title="Frens"
          value="12"
        />
      </div>
    </CardContent>
  </Card>
)

export default MissionsCard;
