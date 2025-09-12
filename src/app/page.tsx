
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UserCard from '@/components/user-card';
import BalanceCard from '@/components/balance-card';
import MiningCircle from '@/components/mining-circle';
import MissionsCard from '@/components/missions-card';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { getUserData, saveUserData, UserData, getUserRank } from '@/lib/database';
import MiningStatusIndicator from '@/components/mining-status-indicator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldBan, Loader2, Bot, ArrowRight, Wallet, Zap, Star } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { increment } from 'firebase/firestore';
import Image from 'next/image';


declare global {
  interface Window {
    Telegram: any;
  }
}

interface User {
    id: number | string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}


export default function Home({}: {}) {
  const [balance, setBalance] = useState(0);
  const [isMiningActive, setIsMiningActive] = useState(false);
  const [miningEndTime, setMiningEndTime] = useState<number | null>(null);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  
  // New state for sequential tasks
  const [hasRedeemedReferral, setHasRedeemedReferral] = useState(false);
  const [hasCompletedWelcomeTasks, setHasCompletedWelcomeTasks] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [miningRate, setMiningRate] = useState(1000);
  
  const [rankInfo, setRankInfo] = useState<{ rank: number; league: string }>({ rank: 0, league: 'Unranked' });


  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: '', description: '', action: null as React.ReactNode | null });

  const showDialog = (title: string, description: string, action: React.ReactNode | null = null) => {
    setDialogContent({ title, description, action });
    setDialogOpen(true);
  };


  const isBrowserUser = user?.first_name === 'Browser User';
  const miningReward = userData?.miningRate || (isBrowserUser ? 700 : 1000);

  const initializeUser = useCallback(async (currentUser: User) => {
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const [dataResponse, userRankInfo] = await Promise.all([
        getUserData(currentUser),
        getUserRank(currentUser)
      ]);
      const { userData: freshUserData, isNewUser } = dataResponse;


      // --- MERGE FLOW FOR NEW TELEGRAM USERS ---
      // This will trigger for any brand new TG user that does not have the `hasMergedBrowserAccount` flag set.
      // Existing users will already have it (or it will be added), new users won't.
      const isTelegramUser = typeof currentUser.id === 'number';
      if (isTelegramUser && isNewUser) {
          router.replace('/merge');
          return; // Stop initialization until merge flow is complete
      }
      // --- END MERGE FLOW ---
      
      setUserData(freshUserData);
      setUser(currentUser);
      setRankInfo(userRankInfo || { rank: 0, league: 'Unranked' });
      setMiningRate(freshUserData.miningRate || (isTelegramUser ? 1000 : 700));
      
      if (freshUserData.status === 'banned') {
        setIsLoading(false);
        return;
      }

      let currentBalance = freshUserData.balance;
      let streakData = freshUserData.dailyStreak;
      let shouldSave = false;
      
      setHasRedeemedReferral(freshUserData.referralBonusApplied);
      const allWelcomeTasksDone = Object.values(freshUserData.welcomeTasks || {}).every(Boolean);
      setHasCompletedWelcomeTasks(allWelcomeTasksDone);
      setIsVerified(freshUserData.verificationStatus === 'verified');

      if (freshUserData.miningEndTime && freshUserData.miningEndTime > Date.now()) {
        setIsMiningActive(true);
        setMiningEndTime(freshUserData.miningEndTime);
      } else if (freshUserData.miningEndTime) {
        const reward = freshUserData.miningRate || (typeof currentUser.id === 'number' ? 1000 : 700);
        currentBalance += reward;
        freshUserData.miningEndTime = null; 
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
        
        const dailyBonus = 200;
        currentBalance += dailyBonus;
        streakData = { count: newStreakCount, lastLogin: today };
        setDailyStreak(newStreakCount);
        
        await saveUserData(currentUser, { 
          balance: currentBalance, 
          dailyStreak: streakData, 
          miningEndTime: freshUserData.miningEndTime 
        });
        
      } else {
        setDailyStreak(streakData.count);
      }
      
      setBalance(currentBalance);
      
      if (shouldSave) {
        await saveUserData(currentUser, { 
          balance: currentBalance, 
          miningEndTime: freshUserData.miningEndTime 
        });
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      showDialog("Error", "Could not load user data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const init = () => {
      let currentUser: User | null = null;
      
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
          const tg = window.Telegram.WebApp;
          currentUser = tg.initDataUnsafe.user;
          setIsTelegram(true);
          tg.ready();
          initializeUser(currentUser);
      } else {
          // It's a browser user or an environment without Telegram
          setIsTelegram(false);
          setIsLoading(false); 
      }
    };
    init();
  }, [initializeUser]);

  
  const handleActivateMining = async () => {
    if (!hasRedeemedReferral) {
       showDialog("Referral Code Required", "Please redeem a referral code to unlock the next step.", <Button onClick={() => router.push('/referral')}>Go to Referrals</Button>);
       return;
    }
     if (!hasCompletedWelcomeTasks) {
       showDialog("Welcome Tasks Required", "Please complete all welcome tasks to continue.", <Button onClick={() => router.push('/welcome-tasks')}>Go to Tasks</Button>);
       return;
    }
    if (!isVerified) {
       showDialog("Verification Required", "Please verify your account on the profile page to start mining.", <Button onClick={() => router.push('/profile')}>Go to Profile</Button>);
       return;
    }

    setIsActivating(true);
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    if (user) {
        await saveUserData(user, { miningEndTime: endTime, miningActivationCount: increment(1) as any });
        setUserData(prev => prev ? {...prev, miningEndTime: endTime, miningActivationCount: (prev.miningActivationCount || 0) + 1} : null);
    }
    setTimeout(() => {
        setIsMiningActive(true);
        setMiningEndTime(endTime);
        setIsActivating(false);
    }, 4000);
  };

  const handleSessionEnd = async () => {
    const newBalance = balance + miningReward;
    setBalance(newBalance);
    setIsMiningActive(false);
    setMiningEndTime(null);
    if(user){
        await saveUserData(user, { balance: newBalance, miningEndTime: null });
        setUserData(prev => prev ? {...prev, balance: newBalance, miningEndTime: null} : null);
    }
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 2000);
  };

  const handleBoost = async (boostId: string, cost: number, title: string) => {
        if (!user || !userData || !window.Telegram?.WebApp) return;
        const tg = window.Telegram.WebApp;

        if (userData.purchasedBoosts?.includes(boostId)) {
            showDialog("Boost Already Active", "You have already purchased this boost.");
            return;
        }

        try {
            const userId = typeof user.id === 'number' ? `user_${user.id}` : `browser_${user.id}`;
            const uniquePayload = `${boostId}-${userId}-${Date.now()}`;

            const response = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    description: `Activate ${title}.`,
                    payload: uniquePayload,
                    currency: 'XTR',
                    amount: cost,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create invoice.');
            }

            const { invoiceUrl } = await response.json();
            
            tg.openInvoice(invoiceUrl, (status: 'paid' | 'cancelled' | 'failed' | 'pending') => {
                 if (status === 'paid') {
                     // The webhook will handle the logic. We can show a pending message here.
                     showDialog("Payment Successful!", "Your boost is being activated. You can refresh the page in a moment to see the changes.");
                 } else {
                     showDialog("Payment Not Completed", "The payment was not completed. Please try again.");
                 }
            });

        } catch (e: any) {
            console.error("Boost error:", e);
            showDialog("Error", `Could not process the boost payment: ${e.message}.`);
        }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (!isTelegram) {
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Bot className="w-16 h-16 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">We've Moved to Telegram!</CardTitle>
                    <CardDescription>
                       Our app is now exclusively available inside the Telegram Mini App for a better and more integrated experience.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-left text-sm text-muted-foreground p-4 border rounded-lg bg-primary/5">
                        <h3 className="font-semibold text-foreground mb-2">How to Recover Your Browser Points:</h3>
                        <ol className="list-decimal list-inside space-y-2">
                            <li>Click the button below to open the app in Telegram.</li>
                            <li>You will be prompted to link your browser account.</li>
                            <li>Enter the Solana wallet address you used here.</li>
                            <li>Your points will be automatically transferred!</li>
                        </ol>
                    </div>

                    <a href="https://t.me/Exnuspoint_bot" className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                        <Bot className="w-5 h-5 mr-2"/>
                        Open in Telegram & Recover Points
                    </a>
                </CardContent>
            </Card>
        </div>
      );
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

  if (!user) {
      // This state should ideally not be reached if the init logic is correct, but it's a safe fallback.
      return (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <Loader2 className="w-16 h-16 text-primary animate-spin" />
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


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm w-full max-w-sm mx-auto p-4 space-y-4">
            <div className="flex justify-between items-start">
            <UserCard 
                user={user}
                userData={userData}
            />
            <MiningStatusIndicator isActive={isMiningActive} />
            </div>
            <BalanceCard balance={balance} animating={showPointsAnimation} miningReward={miningReward} />
        </header>

        <main className="flex flex-col items-center justify-start flex-grow pb-24 pt-4 relative">
            <div className="flex flex-col items-center justify-center space-y-4 my-8 px-4">
              <div className="flex items-center justify-center space-x-2">
                <MiningCircle 
                    isActive={isMiningActive}
                    endTime={miningEndTime}
                    onActivate={handleActivateMining}
                    onSessionEnd={handleSessionEnd}
                    isActivating={isActivating}
                    hasRedeemedReferral={hasRedeemedReferral}
                    hasCompletedWelcomeTasks={hasCompletedWelcomeTasks}
                    isVerified={isVerified}
                    miningReward={miningReward}
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                    <Button 
                        variant="outline" 
                        className="mt-4 animate-heartbeat bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300"
                    >
                        <Zap className="w-4 h-4 mr-2 text-gold" /> Boost
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Boost Your Mining Speed</DialogTitle>
                        <DialogDescription>
                            Increase your daily E-point earnings by purchasing a boost with Telegram Stars. Boosts are stackable.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Card className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground">Booster Pack 1</p>
                                <p className="font-bold text-sm">+2,000 Points Daily</p>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    Cost: 50 <Star className="w-3 h-3 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_1', 50, 'Booster Pack 1')} disabled={userData?.purchasedBoosts?.includes('boost_1')}>
                                {userData?.purchasedBoosts?.includes('boost_1') ? 'Active' : 'Activate'}
                            </Button>
                        </Card>
                        <Card className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground">Booster Pack 2</p>
                                <p className="font-bold text-sm">+4,000 Points Daily</p>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    Cost: 100 <Star className="w-3 h-3 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_2', 100, 'Booster Pack 2')} disabled={userData?.purchasedBoosts?.includes('boost_2')}>
                               {userData?.purchasedBoosts?.includes('boost_2') ? 'Active' : 'Activate'}
                            </Button>
                        </Card>
                         <Card className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground">Booster Pack 3</p>
                                <p className="font-bold text-sm">+8,000 Points Daily</p>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    Cost: 200 <Star className="w-3 h-3 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_3', 200, 'Booster Pack 3')} disabled={userData?.purchasedBoosts?.includes('boost_3')}>
                               {userData?.purchasedBoosts?.includes('boost_3') ? 'Active' : 'Activate'}
                            </Button>
                        </Card>
                         <Card className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground">Booster Pack 4</p>
                                <p className="font-bold text-sm">+20,000 Points Daily</p>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    Cost: 500 <Star className="w-3 h-3 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_4', 500, 'Booster Pack 4')} disabled={userData?.purchasedBoosts?.includes('boost_4')}>
                               {userData?.purchasedBoosts?.includes('boost_4') ? 'Active' : 'Activate'}
                            </Button>
                        </Card>
                         <Card className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-foreground">Booster Pack 5</p>
                                <p className="font-bold text-sm">+40,000 Points Daily</p>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    Cost: 1000 <Star className="w-3 h-3 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_5', 1000, 'Booster Pack 5')} disabled={userData?.purchasedBoosts?.includes('boost_5')}>
                               {userData?.purchasedBoosts?.includes('boost_5') ? 'Active' : 'Activate'}
                            </Button>
                        </Card>
                    </div>
                </DialogContent>
               </Dialog>
            </div>

            <Separator className="w-full max-w-sm my-4 bg-primary/10" />

            <div className="w-full max-w-sm">
            <MissionsCard streak={dailyStreak} rank={rankInfo.rank} league={rankInfo.league} />
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
