'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UserCard from '@/components/user-card';
import BalanceCard from '@/components/balance-card';
import MiningCircle from '@/components/mining-circle';
import MissionsCard from '@/components/missions-card';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/footer';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { getUserData, saveUserData, getLeaderboardUsers, UserData } from '@/lib/database';
import MiningStatusIndicator from '@/components/mining-status-indicator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldBan } from 'lucide-react';

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

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.08l11.07-4.27c.71-.27 1.33.17 1.12.98l-1.89 8.92c-.22.88-1.07 1.1-1.8.61l-4.5-3.35-4.13 3.98c-.41.41-1.1.2-1.28-.31l-1.46-4.3z"/>
    </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 21" fill="currentColor" {...props}>
        <path d="M23.021 1.684C21.312.79 19.457.245 17.526.042L17.45.021c-.021 0-.042.021-.063.042-.147.252-.273.546-.378.84c-1.638-.44-3.318-.44-4.977 0-.105-.294-.23-.588-.378-.84a.083.083 0 0 0-.063-.042l-.084.021C9.564.245 7.709.79 6.001 1.684c-2.162 1.11-3.692 2.912-4.634 5.09C.28 9.545 0 12.33 0 15.135c0 4.316 2.537 7.962 6.273 9.62l.063.021c.105.042.21.063.336.063.21 0 .42-.063.566-.189.44-.314.692-.818.587-1.34C7.66 22.753 7.534 22.21 7.43 21.648c-.084-.461.042-.922.378-1.258a.063.063 0 0 1 .063-.021c.02 0 .04.02.06.04l.02.02c.483.42.987.798 1.512 1.132a.063.063 0 0 0 .084-.021c.021-.021.042-.063.021-.084-.335-.42-.65-.86-.944-1.32a.083.083 0 0 1 .022-.105c.02-.02.06-.02.08.02l.02.02c4.863 3.333 10.167 3.333 15.03 0l.021-.021c.021-.042.063-.042.084-.021.042.021.063.063.021.105-.294.461-.609.9-1.007 1.32a.063.063 0 0 0 .021.084c.021.021.063.042.084.021.524-.335 1.028-.713 1.512-1.132l.021-.021c.021-.021.042-.042.063-.042a.063.063 0 0 1 .063.021c.336.336.462.797.378 1.258-.105.562-.23 1.105-.378 1.668.021.52-.252 1.025-.67 1.34a.72.72 0 0 1-.588.19c.126-.021.23-.042.336-.063l.063-.021c3.736-1.658 6.273-5.304 6.273-9.62 0-2.784-.28-5.569-1.362-8.15C26.713 4.596 25.183 2.794 23.02.684zM9.47 16.5c-1.258 0-2.285-1.216-2.285-2.724s1.027-2.724 2.285-2.724c1.278 0 2.306 1.216 2.285 2.724S10.748 16.5 9.47 16.5zm8.997 0c-1.258 0-2.285-1.216-2.285-2.724s1.027-2.724 2.285-2.724c1.278 0 2.306 1.216 2.285 2.724S19.745 16.5 18.467 16.5z"/>
    </svg>
);


export default function Home({}: {}) {
  const [balance, setBalance] = useState(0);
  const [isForgingActive, setIsForgingActive] = useState(false);
  const [forgingEndTime, setForgingEndTime] = useState<number | null>(null);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [rank, setRank] = useState<number | null>(null);

  // New state for sequential tasks
  const [hasRedeemedReferral, setHasRedeemedReferral] = useState(false);
  const [hasCompletedWelcomeTasks, setHasCompletedWelcomeTasks] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleInitializeUser = useCallback(async (telegramUser: TelegramUser, today: string) => {
    setIsLoading(true);
    try {
        const [freshUserData, { users: leaderboard }] = await Promise.all([
            getUserData(telegramUser),
            getLeaderboardUsers(),
        ]);
        
        setUserData(freshUserData);
        
        if (freshUserData.status === 'banned') {
          setIsLoading(false);
          return;
        }

        setUser(telegramUser);
        let currentBalance = freshUserData.balance;
        let streakData = freshUserData.dailyStreak;
        let shouldSave = false;
        
        const currentUserRank = leaderboard.findIndex(u => u.telegramUser?.id === telegramUser.id);
        setRank(currentUserRank !== -1 ? currentUserRank + 1 : null);
        
        setHasRedeemedReferral(freshUserData.referralBonusApplied);
        const allWelcomeTasksDone = Object.values(freshUserData.welcomeTasks || {}).every(Boolean);
        setHasCompletedWelcomeTasks(allWelcomeTasksDone);
        setIsVerified(freshUserData.verificationStatus === 'verified');


        if (freshUserData.forgingEndTime && freshUserData.forgingEndTime > Date.now()) {
          setIsForgingActive(true);
          setForgingEndTime(freshUserData.forgingEndTime);
        } else if (freshUserData.forgingEndTime) {
          currentBalance += 1000;
          freshUserData.forgingEndTime = null; 
          shouldSave = true;
        }


        if (streakData.lastLogin !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toLocaleDateString('en-CA');

          let newStreakCount = 1;
          if (streakData.lastLogin === yesterdayStr) {
             newStreakCount = (streakData.count % 7) + 1;
          }
          
          currentBalance += 200; // Award points for daily login
          streakData = { count: newStreakCount, lastLogin: today };
          setDailyStreak(newStreakCount);
          shouldSave = true;
        } else {
          setDailyStreak(streakData.count);
        }
        
        setBalance(currentBalance);
        
        if (shouldSave) {
          await saveUserData(telegramUser, { 
            balance: currentBalance, 
            dailyStreak: streakData, 
            forgingEndTime: freshUserData.forgingEndTime 
          });
        }

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
        const today = new Date().toLocaleDateString('en-CA');
        handleInitializeUser(telegramUser, today);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [handleInitializeUser]);
  
  const handleActivateForging = async () => {
    if (!hasRedeemedReferral) {
       toast({
        variant: "destructive",
        title: "Referral Code Required",
        description: "Please redeem a referral code to unlock the next step.",
        action: <Button onClick={() => router.push('/referral')}>Go to Referrals</Button>,
       });
       return;
    }
     if (!hasCompletedWelcomeTasks) {
       toast({
        variant: "destructive",
        title: "Welcome Tasks Required",
        description: "Please complete all welcome tasks to continue.",
        action: <Button onClick={() => router.push('/welcome-tasks')}>Go to Tasks</Button>,
       });
       return;
    }
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
    if (user) {
        await saveUserData(user, { forgingEndTime: endTime });
        setUserData(prev => prev ? {...prev, forgingEndTime: endTime} : null);
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
    if(user){
        await saveUserData(user, { balance: newBalance, forgingEndTime: null });
        setUserData(prev => prev ? {...prev, balance: newBalance, forgingEndTime: null} : null);
    }
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 2000);
  };

  if (isLoading || !user) {
    return null; 
  }

  if (userData?.status === 'banned') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 space-y-8">
        <Alert variant="destructive" className="max-w-sm">
          <ShieldBan className="h-5 w-5" />
          <AlertTitle>Account Blocked</AlertTitle>
          <AlertDescription>
            {userData.banReason || 'This account has been blocked due to a violation of our terms of service.'}
          </AlertDescription>
        </Alert>
        <div className="max-w-sm w-full text-center">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">If you believe this is an error, please contact support:</h3>
            <div className="flex justify-around space-x-4">
                <a href="https://x.com/exnusprotocol" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <XIcon className="w-6 h-6" />
                    <span className="text-xs">X / Twitter</span>
                </a>
                <a href="https://t.me/exnusprotocol" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <TelegramIcon className="w-6 h-6" />
                    <span className="text-xs">Telegram</span>
                </a>
                <a href="https://discord.gg/v8MpYYFdP8" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <DiscordIcon className="w-6 h-6" />
                    <span className="text-xs">Discord</span>
                </a>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 space-y-4">
            <div className="flex justify-between items-start">
            <UserCard 
                user={user}
            />
            <MiningStatusIndicator isActive={isForgingActive} />
            </div>
            <BalanceCard balance={balance} animating={showPointsAnimation} />
        </header>

        <main className="flex flex-col items-center justify-start flex-grow pb-24 pt-4 relative">
            <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4">
            <MiningCircle 
                isActive={isForgingActive}
                endTime={forgingEndTime}
                onActivate={handleActivateForging}
                onSessionEnd={handleSessionEnd}
                isActivating={isActivating}
                hasRedeemedReferral={hasRedeemedReferral}
                hasCompletedWelcomeTasks={hasCompletedWelcomeTasks}
                isVerified={isVerified}
            />
            </div>

            <Separator className="w-full max-w-sm my-4 bg-primary/10" />

            <div className="w-full max-w-sm">
            <MissionsCard streak={dailyStreak} balance={balance} rank={rank} />
            </div>
        </main>
        <Footer />
    </div>
  );
}
