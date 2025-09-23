
'use client';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle, Handshake, ShieldCheck, UserCheck, Users, Zap } from 'lucide-react';
import type { UserData } from '@/lib/database';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  userData: UserData | null;
}

const AchievementItem: FC<{ title: string; isAchieved: boolean; icon: React.ReactNode }> = ({ title, isAchieved, icon }) => (
  <div className="flex items-center space-x-3">
    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", isAchieved ? 'bg-gold/20 text-gold' : 'bg-primary/10 text-muted-foreground')}>
        {icon}
    </div>
    <span className={cn("text-sm", isAchieved ? 'font-semibold text-foreground' : 'text-muted-foreground line-through')}>
      {title}
    </span>
    {isAchieved && <CheckCircle className="w-5 h-5 text-gold ml-auto" />}
  </div>
);

const AchievementCard: FC<AchievementCardProps> = ({ userData }) => {
  if (!userData) return null;

  const achievements = {
    verified: userData.verificationStatus === 'verified',
    firstMining: (userData.miningActivationCount || 0) > 0,
    referredFriend: userData.referrals > 0,
    welcomeTasks: Object.values(userData.welcomeTasks || {}).every(Boolean),
    socialTasks: (userData.completedSocialTasks?.length || 0) >= 5,
  };

  return (
    <Card className="bg-primary/10 border border-primary/20 rounded-lg">
      <CardHeader className="p-4">
        <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-primary/90" />
            <span className="text-primary/90">Achievement Card</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <AchievementItem title="Verified Account" isAchieved={achievements.verified} icon={<ShieldCheck className="w-5 h-5"/>} />
        <AchievementItem title="First Mining Session" isAchieved={achievements.firstMining} icon={<Zap className="w-5 h-5"/>} />
        <AchievementItem title="Referred a Friend" isAchieved={achievements.referredFriend} icon={<Handshake className="w-5 h-5"/>} />
        <AchievementItem title="Joined the Community" isAchieved={achievements.welcomeTasks} icon={<UserCheck className="w-5 h-5"/>} />
        <AchievementItem title="Social Butterfly" isAchieved={achievements.socialTasks} icon={<Users className="w-5 h-5"/>} />
      </CardContent>
    </Card>
  );
};

export default AchievementCard;
