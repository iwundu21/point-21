
'use client';
import { useState, useEffect } from 'react';
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

export default function Home() {
  const [balance, setBalance] = useState(0);
  const [isForgingActive, setIsForgingActive] = useState(false);
  const [forgingEndTime, setForgingEndTime] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const initialize = () => {
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const telegramUser = tg.initDataUnsafe?.user;
        
        if (telegramUser) {
          const userData = getUserData(telegramUser);
          
          if (!userData.onboardingCompleted) {
            const startParam = tg.initDataUnsafe?.start_param;
            const url = startParam ? `/welcome?ref=${startParam}` : '/welcome';
            router.replace(url);
            return;
          }
          
          setUser(telegramUser);
          let currentBalance = userData.balance;
          
          if (userData.verificationStatus === 'verified') {
            setIsVerified(true);
          }

          if (userData.forgingEndTime) {
              const endTime = userData.forgingEndTime;
              if (endTime > Date.now()) {
                  setIsForgingActive(true);
                  setForgingEndTime(endTime);
              } else {
                  currentBalance += 1000;
                  setIsForgingActive(false);
                  setForgingEndTime(null);
                  userData.forgingEndTime = null;
              }
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
            
            currentBalance += 200;
            const newStreak = { count: newStreakCount, lastLogin: today };
            setDailyStreak(newStreakCount);
            userData.dailyStreak = newStreak;
          } else {
            setDailyStreak(streakData.count);
          }
          
          setBalance(currentBalance);
          userData.balance = currentBalance;
          saveUserData(telegramUser, userData);

        } else {
          router.replace('/welcome');
          return; // Stop execution if no user
        }
      } else {
          // If not in Telegram, maybe a dev environment
          const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en' };
          const userData = getUserData(mockUser);
          if(!userData.onboardingCompleted) {
             router.replace('/welcome');
             return;
          }
          setUser(mockUser);
          setBalance(userData.balance);
      }
      setIsLoading(false);
      setIsClient(true);
    }
    
    initialize();
  }, [router]);

  useEffect(() => {
      if (isClient && user) {
          const userData = getUserData(user);
          saveUserData(user, { ...userData, balance, forgingEndTime });
      }
  }, [balance, forgingEndTime, isClient, user]);

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
  
  if (isLoading) {
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
        <UserCard 
            user={user}
        />
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
