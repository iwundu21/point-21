
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, Zap, Crown, Flame } from 'lucide-react';
import StatCard from './stat-card';
import DailyStreak from './daily-streak';

interface MissionsCardProps {
  streak: number;
  balance: number;
  rank: number | null;
}

const getLeagueInfo = (rank: number | null) => {
    if (rank === null) return { name: "Unranked", progress: 0 };
    if (rank <= 10) return { name: "Diamond", progress: 100 };
    if (rank <= 100) return { name: "Platinum", progress: ((100 - (rank-10)) / 90) * 100 };
    if (rank <= 1000) return { name: "Gold", progress: ((1000 - (rank-100)) / 900) * 100 };
    if (rank <= 10000) return { name: "Silver", progress: ((10000 - (rank-1000)) / 9000) * 100 };
    return { name: "Bronze", progress: 5 };
}


const MissionsCard = ({ streak, balance, rank }: MissionsCardProps) => {
    const { name: leagueName, progress } = getLeagueInfo(rank);

    const rankDisplay = rank ? `#${rank.toLocaleString()}` : "Unranked";

    return (
        <div className="w-full max-w-sm p-4 space-y-6">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-primary/90">Missions & Stats</h2>
            </div>
            <div className="space-y-4">
                <DailyStreak streak={streak} />
                <StatCard 
                    icon={<Crown className="w-10 h-10 text-yellow-400" />}
                    title="Current Rank"
                    value={`${rankDisplay} (${leagueName})`}
                    progress={progress}
                />
            </div>
        </div>
    )
}

export default MissionsCard;
