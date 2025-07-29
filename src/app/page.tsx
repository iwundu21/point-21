
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
import { getUserData, saveUserData, UserData, getLeaderboardUsers } from '@/lib/database';
import MiningStatusIndicator from '@/components/mining-status-indicator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldBan } from 'lucide-react';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';


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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleInitializeUser = useCallback(async (telegramUser: TelegramUser) => {
    setIsLoading(true);
    try {
        const freshUserData = await getUserData(telegramUser);
        setUserData(freshUserData);
        
        if (freshUserData.status === 'banned') {
          setIsLoading(false);
          return;
        }

        setUser(telegramUser);
        let currentBalance = freshUserData.balance;
        
        if (freshUserData.verificationStatus === 'verified') {
          setIsVerified(true);
        }

        if (freshUserData.forgingEndTime && freshUserData.forgingEndTime > Date.now()) {
          setIsForgingActive(true);
          setForgingEndTime(freshUserData.forgingEndTime);
        } else if (freshUserData.forgingEndTime) {
          // If forging session has ended, award points.
          currentBalance += 1000;
          freshUserData.forgingEndTime = null; 
        }

        const today = new Date().toISOString().split('T')[0];
        let streakData = freshUserData.dailyStreak;

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
          freshUserData.dailyStreak = newStreak;
        } else {
          setDailyStreak(streakData.count);
        }
        
        setBalance(currentBalance);
        freshUserData.balance = currentBalance;
        await saveUserData(telegramUser, freshUserData);

        // Fetch leaderboard to get rank
        const { users: leaderboard } = await getLeaderboardUsers();
        const rankIndex = leaderboard.findIndex(u => u.telegramUser?.id === telegramUser.id);
        setUserRank(rankIndex !== -1 ? rankIndex + 1 : null);

    } catch (error) {
        console.error("Initialization failed:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load user data. Please try again later.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const init = () => {
      let telegramUser: TelegramUser | null = null;
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        if (tg.initDataUnsafe?.user) {
            telegramUser = tg.initDataUnsafe.user;
            tg.ready();
        }
      }
      
      if (telegramUser) {
        handleInitializeUser(telegramUser);
      } else {
        // Fallback for development
        const mockUser: TelegramUser = { id: 12345, first_name: 'Dev', username: 'devuser', language_code: 'en', photo_url: 'https://placehold.co/128x128.png' };
        handleInitializeUser(mockUser);
      }
    };
    init();
  }, [handleInitializeUser]);

  const handleActivateForging = async () => {
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
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    if (user && userData) {
        const updatedData = { ...userData, forgingEndTime: endTime };
        await saveUserData(user, updatedData);
        setUserData(updatedData);
    }
    setTimeout(() => {
        setIsForgingActive(true);
        setForgingEndTime(endTime);
        setIsActivating(false);
    }, 4000);
  };

  const handleSessionEnd = async () => {
    const newBalance = balance + 1000;
    setBalance(newBalance);
    setIsForgingActive(false);
    setForgingEndTime(null);
    if(user && userData){
        const updatedData = { ...userData, balance: newBalance, forgingEndTime: null };
        await saveUserData(user, updatedData);
        setUserData(updatedData);
    }
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

  if (userData?.status === 'banned') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Alert variant="destructive" className="max-w-sm">
          <ShieldBan className="h-5 w-5" />
          <AlertTitle>Account Blocked</AlertTitle>
          <AlertDescription>
            This account has been blocked. If you believe this is an error, please contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) return null; // Should not happen if not loading and not banned

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
          <MissionsCard streak={dailyStreak} balance={balance} rank={userRank} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
