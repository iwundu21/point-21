
'use client';
import { useState, useEffect } from 'react';
import UserCard from '@/components/user-card';
import BalanceCard from '@/components/balance-card';
import MiningCircle from '@/components/mining-circle';
import MissionsCard from '@/components/missions-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function Home() {
  const [balance, setBalance] = useState(0);
  const [isForgingActive, setIsForgingActive] = useState(false);
  const [forgingEndTime, setForgingEndTime] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);

  useEffect(() => {
    setIsClient(true);
    const savedBalance = localStorage.getItem('exnus_balance');
    const savedEndTime = localStorage.getItem('exnus_forgingEndTime');
    const savedStreak = localStorage.getItem('exnus_daily_streak');

    if (savedBalance) setBalance(JSON.parse(savedBalance));
    
    if (savedEndTime) {
        const endTime = JSON.parse(savedEndTime);
        if (endTime > Date.now()) {
            setIsForgingActive(true);
            setForgingEndTime(endTime);
        } else {
            setBalance(prev => prev + 1000);
            localStorage.removeItem('exnus_forgingEndTime');
        }
    }

    // Daily streak logic
    const today = new Date().toISOString().split('T')[0];
    let streakData = { count: 0, lastLogin: '' };

    if (savedStreak) {
      streakData = JSON.parse(savedStreak);
    }

    if (streakData.lastLogin !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreakCount = 1;
      if (streakData.lastLogin === yesterdayStr && streakData.count < 7) {
        newStreakCount = streakData.count + 1;
      } else if (streakData.count === 7 && streakData.lastLogin === yesterdayStr) {
        newStreakCount = 1;
      }
      
      setBalance(prev => prev + 200);
      setDailyStreak(newStreakCount);
      localStorage.setItem('exnus_daily_streak', JSON.stringify({ count: newStreakCount, lastLogin: today }));
    } else {
      setDailyStreak(streakData.count);
    }

  }, []);

  useEffect(() => {
      if (isClient) {
          localStorage.setItem('exnus_balance', JSON.stringify(balance));
          if (forgingEndTime) {
              localStorage.setItem('exnus_forgingEndTime', JSON.stringify(forgingEndTime));
          } else {
              localStorage.removeItem('exnus_forgingEndTime');
          }
      }
  }, [balance, forgingEndTime, isClient]);

  const handleActivateForging = () => {
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    setIsForgingActive(true);
    setForgingEndTime(endTime);
  };

  const handleSessionEnd = () => {
    setBalance(prev => prev + 1000);
    setIsForgingActive(false);
    setForgingEndTime(null);
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 2000);
  };
  
  const user = {
    username: 'telegram_user',
    id: '123456789'
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-between min-h-screen bg-background p-4 space-y-8">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="w-full h-24 rounded-lg" />
          <Skeleton className="w-full h-24 rounded-lg" />
        </div>
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-64 h-64 rounded-full" />
          <Skeleton className="w-48 h-6" />
        </div>
        <div className="w-full max-w-sm space-y-4">
           <Skeleton className="w-full h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-start min-h-screen bg-background text-foreground font-body">
      <header className="w-full max-w-sm p-4">
        <UserCard username={user.username} userId={user.id} />
        <BalanceCard balance={balance} animating={showPointsAnimation} />
      </header>
      
      <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4">
        <MiningCircle 
          isActive={isForgingActive}
          endTime={forgingEndTime}
          onActivate={handleActivateForging}
          onSessionEnd={handleSessionEnd}
        />
      </div>

      <Separator className="w-full max-w-sm my-4 bg-primary/10" />

      <div className="w-full max-w-sm">
        <MissionsCard streak={dailyStreak} balance={balance} />
      </div>
    </main>
  );
}
