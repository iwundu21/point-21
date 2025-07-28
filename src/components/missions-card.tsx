
'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Gift, Zap, Crown, Flame } from 'lucide-react';
import StatCard from './stat-card';
import DailyStreak from './daily-streak';

interface MissionsCardProps {
  streak: number;
  balance: number;
}

const getLeagueInfo = (balance: number) => {
    if (balance < 1000) return { name: "Bronze", progress: (balance / 1000) * 100 };
    if (balance < 5000) return { name: "Silver", progress: ((balance - 1000) / 4000) * 100 };
    if (balance < 10000) return { name: "Gold", progress: ((balance - 5000) / 5000) * 100 };
    if (balance < 50000) return { name: "Platinum", progress: ((balance - 10000) / 40000) * 100 };
    return { name: "Diamond", progress: 100 };
}

const MissionsCard = ({ streak, balance }: MissionsCardProps) => {
    const { name: leagueName, progress } = getLeagueInfo(balance);
    const rank = Math.floor(50000 - balance / 100);

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
                    value={`#${rank.toLocaleString()} (${leagueName})`}
                    progress={progress}
                />
            </div>
        </div>
    )
}

export default MissionsCard;
