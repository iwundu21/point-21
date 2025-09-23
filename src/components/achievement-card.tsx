
'use client';
import type { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, CheckCircle, Handshake, ShieldCheck, UserCheck, Users, Zap } from 'lucide-react';
import type { UserData } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


interface AchievementCardProps {
  userData: UserData | null;
}

const AchievementSquare: FC<{ title: string; isAchieved: boolean; icon: React.ReactNode }> = ({ title, isAchieved, icon }) => (
    <div className="group w-full aspect-square [perspective:1000px]">
        <div className={cn(
            "relative w-full h-full transition-transform duration-1000 [transform-style:preserve-3d]",
            "animate-turn" // Continuous turn animation
        )}>
            {/* Front of the card */}
            <div className={cn(
                "absolute w-full h-full rounded-lg flex flex-col items-center justify-center p-2 text-center [backface-visibility:hidden]",
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
            </div>
            {/* Back of the card */}
            <div className={cn(
                "absolute w-full h-full rounded-lg flex flex-col items-center justify-center p-2 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]",
                 isAchieved 
                    ? 'bg-gold/20 border-2 border-gold/50 text-gold shadow-lg shadow-gold/10' 
                    : 'bg-primary/10 border border-primary/20 text-muted-foreground'
            )}>
                 <p className="text-xs font-bold leading-tight">
                    {isAchieved ? 'Unlocked' : 'Locked'}
                </p>
                 <p className="text-xs font-semibold leading-tight mt-2">
                    {title}
                </p>
            </div>
        </div>
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
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-3 gap-3">
          <AchievementSquare title="Verified" isAchieved={achievements.verified} icon={<ShieldCheck className="w-8 h-8"/>} />
          <AchievementSquare title="First Mining" isAchieved={achievements.firstMining} icon={<Zap className="w-8 h-8"/>} />
          <AchievementSquare title="Referred Friend" isAchieved={achievements.referredFriend} icon={<Handshake className="w-8 h-8"/>} />
          <AchievementSquare title="Community" isAchieved={achievements.welcomeTasks} icon={<UserCheck className="w-8 h-8"/>} />
          <AchievementSquare title="Social Butterfly" isAchieved={achievements.socialTasks} icon={<Users className="w-8 h-8"/>} />
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementCard;
