
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UserCard from '@/components/user-card';
import BalanceCard from '@/components/balance-card';
import MiningCircle from '@/components/mining-circle';
import MissionsCard from '@/components/missions-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/footer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { getUserData, saveUserData } from '@/lib/database';
import MiningStatusIndicator from '@/components/mining-status-indicator';

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
    photo_url?: string;
}

export default function Home({}: {}) {
  const [balance, setBalance] = useState(0);
  const [isForgingActive, setIsForgingActive] = useState(false);
  const [forgingEndTime, setForgingEndTime] = useState<number | null>(null);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleInitializeUser = useCallback((telegramUser: TelegramUser) => {
    const userData = getUserData(telegramUser);
    
    setUser(telegramUser);
    let currentBalance = userData.balance;
    
    if (userData.verificationStatus === 'verified') {
      setIsVerified(true);
    }

    if (userData.forgingEndTime && userData.forgingEndTime > Date.now()) {
      setIsForgingActive(true);
      setForgingEndTime(userData.forgingEndTime);
    } else if (userData.forgingEndTime) {
      currentBalance += 1000;
      userData.forgingEndTime = null;
    }

    const today = new Date().toISOString().split('T')[0];
    let streakData = userData.dailyStreak;

    if (streakData.lastLogin !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreakCount = 1;
      if (streakData.lastLogin === yesterdayStr) {
         newStreakCount = (streakData.count % 7) + 1;
      }
      
      currentBalance += 200; // Award points for daily login
      const newStreak = { count: newStreakCount, lastLogin: today };
      setDailyStreak(newStreakCount);
      userData.dailyStreak = newStreak;
    } else {
      setDailyStreak(streakData.count);
    }
    
    setBalance(currentBalance);
    userData.balance = currentBalance;
    saveUserData(telegramUser, userData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const init = () => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        const telegramUser = tg.initDataUnsafe?.user;

        if (telegramUser) {
          handleInitializeUser(telegramUser);
        } else {
          // Dev environment or no user found
          const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en', photo_url: 'https://placehold.co/128x128.png' };
          handleInitializeUser(mockUser);
        }
      } else {
        // Fallback for non-Telegram environment
        const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en', photo_url: 'https://placehold.co/128x128.png' };
        handleInitializeUser(mockUser);
      }
    };
    
    if (typeof window !== 'undefined') {
      init();
    }
  }, [handleInitializeUser]);

  useEffect(() => {
      if (!isLoading && user) {
          const userData = getUserData(user);
          saveUserData(user, { ...userData, balance, forgingEndTime });
      }
  }, [balance, forgingEndTime, isLoading, user]);

  const handleActivateForging = () => {
    if (!isVerified) {
       toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Please verify your account on the profile page to start mining.",
        action: <Button onClick={() => router.push('/profile')}>Go to Profile</Button>,
       });
       return;
    }
    setIsActivating(true);
    setTimeout(() => {
        const endTime = Date.now() + 24 * 60 * 60 * 1000;
        setIsForgingActive(true);
        setForgingEndTime(endTime);
        setIsActivating(false);
    }, 4000);
  };

  const handleSessionEnd = () => {
    setBalance(prev => prev + 1000);
    setIsForgingActive(false);
    setForgingEndTime(null);
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 2000);
  };
  
  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 space-y-8">
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
         <div className="flex justify-between items-start">
           <UserCard 
              user={user}
           />
           <MiningStatusIndicator isActive={isForgingActive} />
         </div>
        <BalanceCard balance={balance} animating={showPointsAnimation} />
      </header>
      
      <main className="flex flex-col items-center justify-start flex-grow pb-24">
        <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4">
          <MiningCircle 
            isActive={isForgingActive}
            endTime={forgingEndTime}
            onActivate={handleActivateForging}
            onSessionEnd={handleSessionEnd}
            isVerified={isVerified}
            isActivating={isActivating}
          />
        </div>

        <Separator className="w-full max-w-sm my-4 bg-primary/10" />

        <div className="w-full max-w-sm">
          <MissionsCard streak={dailyStreak} balance={balance} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
