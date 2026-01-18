'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BalanceCard from '@/components/balance-card';
import MissionsCard from '@/components/missions-card';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserData, saveUserData, UserData, getUserRank, getUserId, getTotalUsersCount, getBoosterPack1UserCount, getTotalActivePoints, claimDailyMiningReward, getUsersWithWalletCount } from '@/lib/database';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldBan, Loader2, Bot, Wallet, Zap, Star, Users, CheckCircle, Gift, UserCheck, Handshake, Sparkles, Annoyed } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Image from 'next/image';
import { TelegramUser, getDisplayName } from '@/lib/user-utils';
import TelegramGate from '@/components/telegram-gate';
import Onboarding from '@/components/onboarding';
import { cn } from '@/lib/utils';
import LoadingDots from '@/components/loading-dots';


export default function Home({}: {}) {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isAirdropEnded, setIsAirdropEnded] = useState(false);
  
  const [rankInfo, setRankInfo] = useState<{ rank: number; league: string }>({ rank: 0, league: 'Unranked' });


  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', description: '', action: null as React.ReactNode | null });
  
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUserForOnboarding, setIsNewUserForOnboarding] = useState(false);
  const [onboardingInitialData, setOnboardingInitialData] = useState<UserData | null>(null);

  const [isClaimingBooster, setIsClaimingBooster] = useState(false);
  const [isClaimingTap, setIsClaimingTap] = useState(false);
  const [canTap, setCanTap] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [progress, setProgress] = useState(0);
  const [minedAmount, setMinedAmount] = useState(0);
  
  const DAILY_REWARD = 1000;


  const showDialog = (title: string, description: string, action: React.ReactNode | null = null) => {
    setDialogContent({ title, description, action });
    setDialogOpen(true);
  };


  const initializeUser = useCallback(async (currentUser: TelegramUser) => {
    try {
      const [dataResponse, userRankInfo] = await Promise.all([
        getUserData(currentUser),
        getUserRank(currentUser),
      ]);
      const { userData: freshUserData, isNewUser, isAirdropEnded: airdropStatus } = dataResponse;
      const isTelegramUser = typeof currentUser.id === 'number';

      setIsAirdropEnded(airdropStatus);

      // --- ONBOARDING & MERGE FLOW ---
      if (!isNewUser && (!freshUserData.hasOnboarded || !freshUserData.claimedLegacyBoosts || !freshUserData.hasConvertedToExn)) {
          setOnboardingInitialData(freshUserData);
setShowOnboarding(true);
          setIsNewUserForOnboarding(isNewUser); 
          setIsLoading(false);
          setUser(currentUser);
          return; // Stop initialization to show onboarding
      }

      if (isNewUser && isTelegramUser && !freshUserData.hasMergedBrowserAccount) {
          router.replace('/merge');
          return;
      }
      
      setUserData(freshUserData);
      setUser(currentUser);
      setBalance(freshUserData.balance);
      setRankInfo(userRankInfo || { rank: 0, league: 'Unranked' });
      
      const now = Date.now();
      const lastTap = freshUserData.lastTapTimestamp || 0;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      setCanTap(now - lastTap >= twentyFourHours);
      
      if (freshUserData.status === 'banned') {
        setIsLoading(false);
        return;
      }

    } catch (error: any) {
      console.error("Initialization failed:", error);
       if (error.message.includes("Airdrop capacity reached")) {
           router.replace('/auth');
       } else {
          showDialog("Error", "Could not load user data. Please try again later.");
       }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const init = () => {
      let currentUser: TelegramUser | null = null;
      
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
          const tg = window.Telegram.WebApp;
          currentUser = tg.initDataUnsafe.user;
          setIsTelegram(true);
          tg.ready();
          initializeUser(currentUser);
      } else {
          setIsTelegram(false);
          setIsLoading(false); 
      }
    };
    init();
  }, [initializeUser]);

   useEffect(() => {
    if (canTap || !userData?.lastTapTimestamp) {
      setCountdown('');
      setProgress(0);
      setMinedAmount(canTap ? DAILY_REWARD : 0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTap = userData.lastTapTimestamp || 0;
      const twentyFourHours = 24 * 60 * 60 * 1000;
      const nextClaimTime = lastTap + twentyFourHours;
      const diff = nextClaimTime - now;

      if (diff <= 0) {
        setCountdown('');
        setProgress(100);
        setMinedAmount(DAILY_REWARD);
        setCanTap(true);
        clearInterval(interval);
        return;
      }

      const hours = String(Math.floor((diff / (1000 * 60 * 60)))).padStart(2, '0');
      const minutes = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
      const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      
      setCountdown(`${hours}:${minutes}:${seconds}`);
      
      const elapsedTime = twentyFourHours - diff;
      const currentProgress = (elapsedTime / twentyFourHours);
      setProgress(currentProgress * 100);
      setMinedAmount(Math.floor(currentProgress * DAILY_REWARD));

    }, 1000);

    return () => clearInterval(interval);
  }, [canTap, userData?.lastTapTimestamp]);
  
  const handleDailyTap = async () => {
    if (!user || !canTap || isClaimingTap || isAirdropEnded) return;

setIsClaimingTap(true);
    try {
        const userId = getUserId(user);
        const result = await claimDailyMiningReward(userId);
        if (result.success && result.newBalance) {
            setBalance(result.newBalance);
setCanTap(false);
            const now = Date.now();
            setUserData(prev => prev ? {...prev, lastTapTimestamp: now, balance: result.newBalance as number} : null);
showDialog("Reward Claimed!", `You've earned ${DAILY_REWARD} EXN. The next mining cycle has started!`);
        } else {
showDialog("Already Claimed", "You have already claimed your daily reward for today.");
setCanTap(false);
        }
    } catch (e) {
        console.error("Error claiming daily tap:", e);
showDialog("Error", "An unexpected error occurred.");
    } finally {
setIsClaimingTap(false);
    }
  };

  const handleOnboardingComplete = () => {
setShowOnboarding(false);
setOnboardingInitialData(null);
      if (user) {
setIsLoading(true);
initializeUser(user);
      }
  }


  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <LoadingDots />
        </div>
    );
  }
  
  if (!isTelegram) {
      return (
         <TelegramGate />
      );
  }

  if (showOnboarding && user && onboardingInitialData) {
    return <Onboarding user={user} isNewUser={isNewUserForOnboarding} onComplete={handleOnboardingComplete} initialData={onboardingInitialData}/>;
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
                    <Image src="/x.jpg" alt="X/Twitter" width={24} height={24} />
                    <span className="text-xs">X / Twitter</span>
                </a>
                <a href="https://t.me/exnusprotocol" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <Image src="/tg.jpg" alt="Telegram" width={24} height={24} />
                    <span className="text-xs">Telegram</span>
                </a>
                <a href="https://discord.gg/v8MpYYFdP8" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                    <Image src="/discord.jpg" alt="Discord" width={24} height={24} />
                    <span className="text-xs">Discord</span>
                </a>
            </div>
        </div>
      </div>
    );
  }

    if (isAirdropEnded) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <header className="sticky top-0 z-10 bg-transparent/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 space-y-4">
                <BalanceCard balance={balance} user={user} />
            </header>
            <main className="flex flex-col items-center justify-center flex-grow p-4">
                <Card className="max-w-md w-full text-center glass-card">
                    <CardHeader>
                        <div className="flex justify-center mb-4">
                            <Annoyed className="w-16 h-16 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">The Airdrop Has Concluded</CardTitle>
                        <CardDescription>
                           Thank you for your participation! The EXN earning period has now ended.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Your final balance is shown above. Please stay tuned for announcements regarding token distribution. Follow our social channels for the latest updates.
                        </p>
                        <div className="flex justify-around space-x-4 pt-4">
                            <a href="https://x.com/exnusprotocol" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                                <Image src="/x.jpg" alt="X/Twitter" width={24} height={24} />
                                <span className="text-xs">X / Twitter</span>
                            </a>
                            <a href="https://t.me/exnusprotocol" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                                <Image src="/tg.jpg" alt="Telegram" width={24} height={24} />
                                <span className="text-xs">Telegram</span>
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </div>
    );
  }

  if (!user || !userData) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <LoadingDots />
                    </div>
                    <CardTitle className="text-2xl">Loading Application</CardTitle>
                    <CardDescription>
                       If the app does not load, please try refreshing the page or opening it inside Telegram.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <a href="https://t.me/Exnuspoint_bot" className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                        <Bot className="w-5 h-5 mr-2"/>
                        Open in Telegram
                    </a>
                </CardContent>
            </Card>
        </div>
      );
  }

  const welcomeTasksDone = Object.values(userData.welcomeTasks || {}).every(Boolean);
  const referralBonusApplied = userData.referralBonusApplied;
  const prerequisitesMet = welcomeTasksDone && referralBonusApplied;

  const WaterWaveProgress = ({ progress }: { progress: number }) => {
    const waveHeight = `${100 - progress}%`;
  
    return (
      <div className="relative w-full h-full rounded-full overflow-hidden bg-transparent border-4 border-primary/20">
        <div 
          className="absolute bottom-0 left-0 w-full bg-gold/80 transition-all duration-500 ease-in-out" 
          style={{ height: `${progress}%` }}
        >
          <div className="absolute top-0 left-0 w-full h-4 -mt-2">
            <div className="absolute w-[200%] h-full bg-no-repeat bg-center bg-contain"
                 style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 10 C 50 20, 150 -10, 200 10 L 200 20 L 0 20' fill='hsl(var(--gold))' opacity='0.5'%3e%3c/path%3e%3c/svg%3e")`,
                    backgroundSize: '50% 100%',
                 }}
            >
              <div className="wave-animation absolute top-0 left-0 w-full h-full bg-no-repeat bg-center"
                   style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 10 C 50 0, 150 20, 200 10 L 200 20 L 0 20' fill='hsl(var(--gold))'%3e%3c/path%3e%3c/svg%3e")`,
                      backgroundSize: '50% 100%',
                      animation: 'wave 2s linear infinite'
                   }}
              ></div>
              <div className="wave-animation absolute top-0 left-0 w-full h-full bg-no-repeat bg-center"
                   style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M0 10 C 50 0, 150 20, 200 10 L 200 20 L 0 20' fill='hsl(var(--gold))'%3e%3c/path%3e%3c/svg%3e")`,
                      backgroundSize: '50% 100%',
                      animation: 'wave-reverse 2s linear infinite',
                      opacity: 0.5
                   }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground font-body">
        <header className="sticky top-0 z-10 bg-transparent/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 space-y-4">
            <BalanceCard balance={balance} user={user} />
        </header>

        <main className="flex flex-col items-center justify-center flex-grow pb-24 pt-4 relative">
            <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4 w-full max-w-sm">
                <Card className="w-full p-6 text-center space-y-4 glass-card">
                    {prerequisitesMet ? (
                        <>
                            <div
                                className={cn(
                                    "relative w-40 h-40 mx-auto flex flex-col items-center justify-center transition-all duration-300",
                                    canTap && "cursor-pointer hover:scale-105"
                                )}
                                onClick={handleDailyTap}
                            >
                                <div className="absolute inset-0 flex items-center justify-center">
                                     <WaterWaveProgress progress={progress} />
                                </div>
                               

                                <div className="z-10 text-center">
                                    {isClaimingTap ? (
                                        <LoadingDots />
                                    ) : !canTap ? (
                                        <>
                                            <p className="text-4xl font-bold text-white tabular-nums">{minedAmount}</p>
                                            <p className="text-sm font-semibold text-white/80">EXN</p>
                                            <p className="text-xs text-white/80 mt-1">{countdown}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-3xl font-bold text-white">CLAIM</p>
                                            <p className="text-lg font-semibold text-white">{DAILY_REWARD} EXN</p>
                                        </>
                                    )}
                                </div>
                            </div>
                            <h2 className="text-xl font-bold">Daily Mining</h2>
                            <p className="text-muted-foreground text-sm">
                                {canTap ? `Your ${DAILY_REWARD} EXN reward is ready to be claimed!` : `Your EXN is mining. You will earn ${DAILY_REWARD} EXN when the countdown ends.`}
                            </p>
                        </>
                    ) : (
                        <div
                            className="w-56 h-56 rounded-full border-4 border-dashed border-primary/50 flex flex-col items-center justify-center p-4 text-center space-y-3 animate-pulse cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => {
                                if (!welcomeTasksDone) {
                                    router.push('/welcome-tasks');
                                } else if (!referralBonusApplied) {
                                    router.push('/referral');
                                }
                            }}
                        >
                            {!welcomeTasksDone ? (
                                <>
                                    <Gift className="w-12 h-12 text-primary" />
                                    <h2 className="text-xl font-bold">Complete Welcome Tasks</h2>
                                    <p className="text-muted-foreground text-xs px-4">
                                        Finish your first set of tasks to unlock the next step.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <Handshake className="w-12 h-12 text-primary" />
                                    <h2 className="text-xl font-bold">Redeem a Referral Code</h2>
                                    <p className="text-muted-foreground text-xs px-4">
                                        Apply a referral code to start your daily mining.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </Card>
            </div>

            <Separator className="w-full max-w-sm my-4 bg-primary/10" />

            <div className="w-full max-w-sm">
            <MissionsCard 
                streak={userData.dailyStreak.count} 
                rank={rankInfo.rank} 
                league={rankInfo.league} 
                userData={userData}
            />
            </div>
        </main>
        <Footer />
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>

                    <AlertDialogDescription>
                        {dialogContent.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {dialogContent.action}
                    <AlertDialogAction onClick={() => setDialogOpen(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
