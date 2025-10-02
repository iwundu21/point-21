
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
import { ShieldBan, Loader2, Bot, Wallet, Zap, Star, Users, CheckCircle, Gift, UserCheck, Handshake, Sparkles } from 'lucide-react';
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
import { processBoost } from '@/ai/flows/process-boost-flow';
import LoadingDots from '@/components/loading-dots';
import { ContributeDialog } from '@/components/contribute-dialog';


export default function Home({}: {}) {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState(false);
  
  const [rankInfo, setRankInfo] = useState<{ rank: number; league: string }>({ rank: 0, league: 'Unranked' });
  const [walletSubmittedCount, setWalletSubmittedCount] = useState(0);


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
  
  const AIRDROP_CAP = 300000;
  const DAILY_REWARD = 500;


  const showDialog = (title: string, description: string, action: React.ReactNode | null = null) => {
    setDialogContent({ title, description, action });
    setDialogOpen(true);
  };


  const initializeUser = useCallback(async (currentUser: TelegramUser) => {
    try {
      const [dataResponse, userRankInfo, walletCount] = await Promise.all([
        getUserData(currentUser),
        getUserRank(currentUser),
        getUsersWithWalletCount(),
      ]);
      const { userData: freshUserData, isNewUser } = dataResponse;
      const isTelegramUser = typeof currentUser.id === 'number';

      setWalletSubmittedCount(walletCount);

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
    if (!user || !canTap || isClaimingTap) return;

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

  const handleContribution = (newBalance: number, newTotalContributed: number) => {
setBalance(newBalance);
      setUserData(prev => prev ? { ...prev, balance: newBalance, totalContributedStars: newTotalContributed } : null);
  };

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

  const prerequisitesMet = userData.verificationStatus === 'verified' && Object.values(userData.welcomeTasks || {}).every(Boolean) && userData.referralBonusApplied;

  const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 56;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <svg height={radius * 2} width={radius * 2} className="-rotate-90">
            <circle
                stroke="hsla(var(--muted-foreground), 0.3)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                stroke="hsl(var(--gold))"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={`${circumference} ${circumference}`}
                style={{ strokeDashoffset }}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-300"
                strokeLinecap="round"
            />
        </svg>
    );
};

  return (
    <div className="flex flex-col min-h-screen bg-transparent text-foreground font-body">
        <header className="sticky top-0 z-10 bg-transparent/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 space-y-4">
            <BalanceCard balance={balance} user={user} />
        </header>

        <main className="flex flex-col items-center justify-start flex-grow pb-24 pt-4 relative">
             <div className="w-full max-w-sm px-4 space-y-4">
                 <Card className="w-full glass-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Wallet Submissions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={(walletSubmittedCount / AIRDROP_CAP) * 100} className="w-full h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>Submitted: {walletSubmittedCount.toLocaleString()}</span>
                            <span>Target: {(AIRDROP_CAP).toLocaleString()}</span>
                        </div>
                         <p className="text-center text-xs text-muted-foreground mt-2">
                            Progress towards our goal of 300,000 wallet submissions.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4 w-full max-w-sm">
                 <ContributeDialog user={user} userData={userData} onContribution={handleContribution}>
                    <Button className="w-full h-12 text-lg animate-heartbeat bg-primary/80 hover:bg-primary/90">
                        <Sparkles className="w-5 h-5 mr-2 text-primary-foreground" />
                        Contribute to the Ecosystem
                    </Button>
                </ContributeDialog>

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
                                    <CircularProgress progress={progress} />
                                </div>
                                <div className="absolute inset-0 bg-cover bg-center rounded-full m-3" style={{ backgroundImage: `url('/5.jpg')` }}></div>

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
                                {canTap ? `Your ${DAILY_REWARD} EXN reward is ready to be claimed!` : "Your EXN is mining. Check back when the countdown ends to claim."}
                            </p>
                        </>
                    ) : (
                         <div className="text-center p-4 rounded-full space-y-4">
                            <h2 className="text-xl font-bold">Unlock Daily Mining</h2>
                            <p className="text-muted-foreground text-sm">
                                To unlock your daily mining rewards, you must complete all Welcome Tasks, redeem a referral code, and verify your account.
                            </p>
                            <div className='flex flex-wrap gap-2 justify-center'>
                                <Button onClick={() => router.push('/welcome-tasks')} variant='outline' size="sm">
                                    <Gift className="w-4 h-4 mr-2" />
                                    Welcome Tasks
                                </Button>
                                <Button onClick={() => router.push('/referral')} variant='outline' size="sm">
                                    <Handshake className="w-4 h-4 mr-2" />
                                    Referral Code
                                </Button>
                                <Button onClick={() => router.push('/profile')} variant='outline' size="sm">
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Verify Account
                                </Button>
                            </div>
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
