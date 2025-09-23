
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, Zap, Crown, Flame } from 'lucide-react';
import RankCard from './rank-card';
import DailyStreak from './daily-streak';
import AchievementCard from './achievement-card';
import { UserData } from "@/lib/database";

interface MissionsCardProps {
  streak: number;
  rank: number;
  league: string;
  userData: UserData | null;
}

const MissionsCard = ({ streak, rank, league, userData }: MissionsCardProps) => {
    return (
        <div className="w-full max-w-sm p-4 space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-primary/90">Missions & Stats</h2>
            </div>
            <div className="space-y-4">
                <DailyStreak streak={streak} />
                <RankCard 
                    rank={rank}
                    league={league}
                />
            </div>
        </div>
    )
}

export default MissionsCard;
