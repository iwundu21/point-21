
'use client';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Award, CheckCircle, Handshake, ShieldCheck, UserCheck, Users, Zap } from 'lucide-react';
import type { UserData } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface AchievementCardProps {
  userData: UserData | null;
}

const AchievementSquare: FC<{ title: string; isAchieved: boolean; icon: React.ReactNode }> = ({ title, isAchieved, icon }) => (
    <div className={cn(
        "relative w-full aspect-square rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all duration-500",
        isAchieved 
            ? 'bg-gold/20 border-2 border-gold/50 text-gold shadow-lg shadow-gold/10' 
            : 'bg-primary/10 border border-primary/20 text-muted-foreground'
    )}>
        <div className="mb-2">{icon}</div>
        <p className={cn(
            "text-xs font-semibold leading-tight",
            isAchieved ? 'text-gold' : 'text-muted-foreground'
        )}>
            {title}
        </p>
        {isAchieved && (
            <p className="text-xs font-bold text-gold mt-1">+100 EXN</p>
        )}
    </div>
);

const AchievementCard: FC<AchievementCardProps> = ({ userData }) => {
  if (!userData) return null;

  const achievements = {
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
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-3">
          <AchievementSquare title="First Mining" isAchieved={achievements.firstMining} icon={<Zap className="w-8 h-8"/>} />
          <AchievementSquare title="Referred Friend" isAchieved={achievements.referredFriend} icon={<Handshake className="w-8 h-8"/>} />
          <AchievementSquare title="Community" isAchieved={achievements.welcomeTasks} icon={<UserCheck className="w-8 h-8"/>} />
          <AchievementSquare title="Social Butterfly" isAchieved={achievements.socialTasks} icon={<Users className="w-8 h-8"/>} />
        </div>
      </CardContent>
       <CardFooter className="p-4 pt-0">
        <p className="text-xs text-muted-foreground text-center w-full">
          A fully achieved card can be converted to extra EXN rewards.
        </p>
      </CardFooter>
    </Card>
  );
};

export default AchievementCard;
