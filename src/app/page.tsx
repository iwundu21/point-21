

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BalanceCard from '@/components/balance-card';
import MissionsCard from '@/components/missions-card';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserData, saveUserData, UserData, getUserRank, getUserId, getTotalUsersCount, getBoosterPack1UserCount, getTotalActivePoints, claimDailyTapReward } from '@/lib/database';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldBan, Loader2, Bot, Wallet, Zap, Star, Users, CheckCircle, Gift, UserCheck, Handshake } from 'lucide-react';
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


export default function Home({}: {}) {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTelegram, setIsTelegram] = useState(false);
  
  const [rankInfo, setRankInfo] = useState<{ rank: number; league: string }>({ rank: 0, league: 'Unranked' });
  const [boosterCount, setBoosterCount] = useState(0);


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
  
  const AIRDROP_CAP = 300000;


  const showDialog = (title: string, description: string, action: React.ReactNode | null = null) => {
    setDialogContent({ title, description, action });
    setDialogOpen(true);
  };


  const initializeUser = useCallback(async (currentUser: TelegramUser) => {
    try {
      const [dataResponse, userRankInfo, boosterUsers] = await Promise.all([
        getUserData(currentUser),
        getUserRank(currentUser),
        getBoosterPack1UserCount(),
      ]);
      const { userData: freshUserData, isNewUser } = dataResponse;
      const isTelegramUser = typeof currentUser.id === 'number';

      setBoosterCount(boosterUsers);

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
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTap = userData.lastTapTimestamp || 0;
      const nextClaimTime = lastTap + (24 * 60 * 60 * 1000);
      const diff = nextClaimTime - now;

      if (diff <= 0) {
        setCountdown('');
        setCanTap(true);
        clearInterval(interval);
        return;
      }

      const hours = String(Math.floor((diff / (1000 * 60 * 60)))).padStart(2, '0');
      const minutes = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
      const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
      
      setCountdown(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [canTap, userData?.lastTapTimestamp]);
  
  const handleSuccessfulPayment = useCallback(async () => {
      if (!user) return;
      try {
        const userId = getUserId(user);
        const result = await processBoost({ userId, boostId: 'boost_1' });
        
        if (result.success && result.newBalance !== undefined) {
          setUserData(prev => prev ? { ...prev, balance: result.newBalance!, purchasedBoosts: [...(prev.purchasedBoosts || []), 'boost_1'] } : null);
          setBalance(result.newBalance);
          setBoosterCount(prev => prev + 1);
          showDialog("Booster Activated!", "You have received 5,000 EXN and unlocked daily tapping!");
        } else if (result.reason) {
            // This might happen in a race condition, but it's good to handle.
            showDialog("Already Activated", result.reason);
        }

      } catch (e) {
        console.error("Error processing boost after payment:", e);
        showDialog("Payment Process Error", "There was an issue crediting your account. Please contact support.");
      }
  }, [user]);

  useEffect(() => {
    const handleInvoiceClosed = (event: {slug: string; status: 'paid' | 'cancelled' | 'failed' | 'pending'}) => {
        if(event.status === 'paid') {
           handleSuccessfulPayment();
        } else {
           showDialog('Payment Not Completed', `The payment was ${event.status}. Please try again.`);
        }
        setIsClaimingBooster(false); // Re-enable the button
    }
    
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.onEvent('invoiceClosed', handleInvoiceClosed);
        return () => {
             window.Telegram.WebApp.offEvent('invoiceClosed', handleInvoiceClosed);
        }
    }
  }, [handleSuccessfulPayment]);


  
  const handleSecureAirdrop = async () => {
    if (!user || !userData || isClaimingBooster || userData.purchasedBoosts?.includes('boost_1')) return;

    setIsClaimingBooster(true);
    try {
        const userId = getUserId(user);
        const response = await fetch('/api/create-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Booster Pack 1',
                description: 'Activate your booster to get a 5,000 EXN welcome bonus and secure your airdrop spot.',
                payload: `boost_1_user_${userId}`,
                currency: 'XTR',
                amount: 70
            })
        });

        const { invoiceUrl, error } = await response.json();

        if (error) {
            throw new Error(error);
        }
        
        if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.openInvoice(invoiceUrl);
        } else {
            throw new Error('Telegram WebApp context not found.');
        }

    } catch (e: any) {
        console.error("Error creating invoice:", e);
        showDialog("Error", `Could not initiate payment: ${e.message}`);
        setIsClaimingBooster(false); // Re-enable button on failure
    }
  };

  const handleDailyTap = async () => {
    if (!user || !canTap || isClaimingTap) return;

    setIsClaimingTap(true);
    try {
        const userId = getUserId(user);
        const result = await claimDailyTapReward(userId);
        if (result.success && result.newBalance) {
            setBalance(result.newBalance);
            setCanTap(false);
            const now = Date.now();
            setUserData(prev => prev ? {...prev, lastTapTimestamp: now, balance: result.newBalance as number} : null);
            showDialog("Reward Claimed!", "You've earned 100 EXN. Come back tomorrow!");
        } else {
            showDialog("Already Claimed", "You have already claimed your daily tap reward for today.");
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

  const hasBooster = userData.purchasedBoosts?.includes('boost_1');

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 space-y-4">
            <BalanceCard balance={balance} user={user} />
        </header>

        <main className="flex flex-col items-center justify-start flex-grow pb-24 pt-4 relative">
             <div className="w-full max-w-sm px-4 space-y-4">
                 <Card className="w-full bg-primary/10 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" />
                            Airdrop Slots Secured
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Progress value={(boosterCount / AIRDROP_CAP) * 100} className="w-full h-3" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                            <span>Taken: {boosterCount.toLocaleString()}</span>
                            <span>Available: {(AIRDROP_CAP - boosterCount).toLocaleString()}</span>
                        </div>
                         <p className="text-center text-xs text-muted-foreground mt-2">
                            Only users who secure their airdrop slot are counted here.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4 w-full max-w-sm">
                {!hasBooster && (
                    <Card className="w-full p-6 text-center space-y-4 bg-primary/10 border-primary/20">
                        <Zap className="w-16 h-16 mx-auto text-primary" />
                        <h2 className="text-xl font-bold">Secure Your Airdrop Spot</h2>
                        <p className="text-muted-foreground text-sm">
                            Activate your Booster Pack for <strong className="text-primary">70 Stars</strong> to get a <strong className="text-gold">5,000 EXN</strong> welcome bonus.
                        </p>
                        <Button 
                            onClick={handleSecureAirdrop} 
                            disabled={isClaimingBooster} 
                            className="w-full h-12 text-lg animate-heartbeat"
                        >
                            {isClaimingBooster ? <LoadingDots /> : "Secure Airdrop & Get 5,000 EXN"}
                        </Button>
                    </Card>
                )}

                <Card className="w-full p-6 text-center space-y-4 bg-primary/5">
                        <div 
                        className={cn(
                            "w-40 h-40 rounded-full mx-auto flex flex-col items-center justify-center transition-all duration-300",
                            !canTap ? "bg-muted/30 border-4 border-muted-foreground/30" : "bg-gold/20 border-4 border-gold/50 cursor-pointer hover:scale-105 animate-heartbeat"
                        )}
                        onClick={handleDailyTap}
                    >
                        {isClaimingTap ? (
                            <LoadingDots />
                        ) : !canTap ? (
                             countdown ? (
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-muted-foreground tabular-nums">{countdown}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Next claim</p>
                                </div>
                            ) : (
                                <CheckCircle className="w-16 h-16 text-muted-foreground/50" />
                            )
                        ) : (
                            <div className="text-center">
                                <p className="text-4xl font-bold text-gold">TAP</p>
                                <p className="text-sm font-semibold text-gold">+100 EXN</p>
                            </div>
                        )}
                    </div>
                    <h2 className="text-xl font-bold">Daily Tap Reward</h2>
                    <p className="text-muted-foreground text-sm">
                        {canTap ? "Tap the button to claim your 100 EXN for today!" : "You have already claimed your daily reward. Come back tomorrow!"}
                    </p>
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





    
