
'use client';
import type { FC } from 'react';
import { Crown } from 'lucide-react';
import StatCard from './stat-card';
import { useLoader } from './loader-provider';

interface RankCardProps {
  rank: number;
  league: string;
}

const RankCard: FC<RankCardProps> = ({ rank, league }) => {
  const { showLoader } = useLoader();

  const getRankDisplay = (rank: number) => {
    if (rank <= 0) {
      return 'Unranked';
    }
    return `#${rank.toLocaleString()}`;
  };

  const getProgress = (rank: number) => {
    if (rank <= 0) return 0;
    if (rank <= 10) return 100; // Diamond
    if (rank <= 100) return ((100 - (rank - 11)) / 90) * 100; // Platinum
    if (rank <= 1000) return ((1000 - (rank - 101)) / 900) * 100; // Gold
    if (rank <= 10000) return ((10000 - (rank - 1001)) / 9000) * 100; // Silver
    return 5; // Bronze
  };

  return (
    <div onClick={() => showLoader('/leaderboard')} className="cursor-pointer">
       <StatCard 
            icon={<Crown className="w-10 h-10 text-muted-foreground" />}
            title={league}
            value={getRankDisplay(rank)}
            progress={getProgress(rank)}
            isLink={true}
        />
    </div>
  );
};

export default RankCard;
