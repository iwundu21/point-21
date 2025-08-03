
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, Zap, Crown, Flame } from 'lucide-react';
import StatCard from './stat-card';
import DailyStreak from './daily-streak';

interface MissionsCardProps {
  streak: number;
}

const MissionsCard = ({ streak }: MissionsCardProps) => {
    return (
        <div className="w-full max-w-sm p-4 space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-primary/90">Missions & Stats</h2>
            </div>
            <div className="space-y-4">
                <DailyStreak streak={streak} />
                <StatCard 
                    icon={<Crown className="w-10 h-10 text-muted-foreground" />}
                    title="Current Rank"
                    value="View on Leaderboard"
                />
            </div>
        </div>
    )
}

export default MissionsCard;
