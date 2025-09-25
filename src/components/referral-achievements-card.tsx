
'use client';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Users, Trophy } from 'lucide-react';
import type { UserData, AchievementKey } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";

interface ReferralAchievementsCardProps {
  userData: UserData | null;
}

interface Tier {
    key: AchievementKey;
    goal: number;
    reward: number;
    title: string;
}

const TIERS: Tier[] = [
    { key: 'ref10', goal: 10, reward: 300, title: 'Networker' },
    { key: 'ref30', goal: 30, reward: 400, title: 'Connector' },
    { key: 'ref50', goal: 50, reward: 500, title: 'Influencer' },
    { key: 'ref100', goal: 100, reward: 1000, title: 'Ambassador' },
    { key: 'ref250', goal: 250, reward: 2500, title: 'Evangelist' },
    { key: 'ref500', goal: 500, reward: 5000, title: 'Legend' },
];

const ReferralAchievementTier: FC<{ title: string; goal: number; reward: number; current: number; isAchieved: boolean; }> = ({ title, goal, reward, current, isAchieved }) => {
    const progress = Math.min((current / goal) * 100, 100);

    return (
        <div className={cn(
            "p-4 rounded-lg flex items-center space-x-4 transition-all duration-500",
            isAchieved 
                ? 'bg-gold/10 border border-gold/30' 
                : 'bg-primary/5 border border-primary/10'
        )}>
            <div className={cn(
                "w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center",
                isAchieved ? "bg-gold/20 text-gold" : "bg-primary/10 text-primary"
            )}>
                {isAchieved ? <Trophy className="w-8 h-8" /> : <Users className="w-8 h-8" />}
            </div>
            <div className="flex-grow space-y-1">
                <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-xs font-bold text-gold">+{reward} EXN</p>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between items-baseline text-xs text-muted-foreground">
                    <span>{isAchieved ? 'Completed' : `${current} / ${goal} Referrals`}</span>
                </div>
            </div>
        </div>
    );
};

const ReferralAchievementsCard: FC<ReferralAchievementsCardProps> = ({ userData }) => {
  if (!userData) return null;

  const referrals = userData.referrals || 0;
  const claimed = userData.claimedAchievements || [];

  return (
    <Card className="bg-primary/10 border border-primary/20 rounded-lg">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary/90" />
            <span className="text-primary/90">Referral Milestones</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {TIERS.map((tier) => (
            <ReferralAchievementTier
                key={tier.key}
                title={tier.title}
                goal={tier.goal}
                reward={tier.reward}
                current={referrals}
                isAchieved={claimed.includes(tier.key)}
            />
        ))}
      </CardContent>
    </Card>
  );
};

export default ReferralAchievementsCard;
