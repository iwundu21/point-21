
'use client';
import { useState, useEffect } from 'react';
import UserCard from '@/components/user-card';
import BalanceCard from '@/components/balance-card';
import MiningCircle from '@/components/mining-circle';
import MissionsCard from '@/components/missions-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    is_premium?: boolean;
}

export default function Home() {
  const [balance, setBalance] = useState(0);
  const [isForgingActive, setIsForgingActive] = useState(false);
  const [forgingEndTime, setForgingEndTime] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    // This effect runs once on component mount on the client side.
    // We set isClient to true to trigger another effect that will handle all client-side logic.
    setIsClient(true);
  }, []);

  useEffect(() => {
    // This effect runs only on the client, after the component has mounted.
    if (!isClient) {
      return;
    }
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      const telegramUser = tg.initDataUnsafe?.user;
      if (telegramUser) {
        setUser(telegramUser);
      }
    }

    const savedBalance = localStorage.getItem('exnus_balance');
    const savedEndTime = localStorage.getItem('exnus_forgingEndTime');
    const savedStreak = localStorage.getItem('exnus_daily_streak');

    let currentBalance = 0;
    if (savedBalance) {
      currentBalance = JSON.parse(savedBalance);
    }
    
    if (savedEndTime) {
        const endTime = JSON.parse(savedEndTime);
        if (endTime > Date.now()) {
            setIsForgingActive(true);
            setForgingEndTime(endTime);
        } else {
            // Give points for finished session if they open the app after it's done
            currentBalance += 1000;
            localStorage.removeItem('exnus_forgingEndTime');
            setIsForgingActive(false);
            setForgingEndTime(null);
        }
    }

    // Daily streak logic
    const today = new Date().toISOString().split('T')[0];
    let streakData = { count: 0, lastLogin: '' };

    if (savedStreak) {
      try {
        streakData = JSON.parse(savedStreak);
      } catch (e) {
        console.error("Could not parse daily streak data", e);
      }
    }

    if (streakData.lastLogin !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreakCount = 1;
      if (streakData.lastLogin === yesterdayStr) {
         newStreakCount = (streakData.count % 7) + 1;
      }
      
      currentBalance += 200;
      setDailyStreak(newStreakCount);
      localStorage.setItem('exnus_daily_streak', JSON.stringify({ count: newStreakCount, lastLogin: today }));
    } else {
      setDailyStreak(streakData.count);
    }
    
    setBalance(currentBalance);

  // The dependency array ensures this effect runs only when isClient becomes true.
  }, [isClient]);

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
  
  if (!isClient || !user) {
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
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4">
        <UserCard username={user.username || `${user.first_name} ${user.last_name || ''}`.trim()} userId={user.id.toString()} />
        <BalanceCard balance={balance} animating={showPointsAnimation} />
      </header>
      
      <main className="flex flex-col items-center justify-start flex-grow">
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
    </div>
  );
}
