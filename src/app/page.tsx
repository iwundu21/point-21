

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

    const handleBoost = async (boostId: string, cost: number, boostAmount: number, title: string) => {
        if (!user || !userData || !window.Telegram?.WebApp) return;

        if (userData.purchasedBoosts?.includes(boostId)) {
            showDialog("Boost Already Active", "You have already purchased this boost.");
            return;
        }

        const tg = window.Telegram.WebApp;

        try {
            showDialog("Processing Boost...", "Please wait while we create your payment invoice.");

            const response = await fetch('/api/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    description: `Boost your mining rate by ${boostAmount.toLocaleString()} points per day.`,
                    payload: `${boostId}-${user.id}`,
                    currency: 'XTR',
                    amount: cost,
                }),
            });

            const { invoiceUrl, error } = await response.json();
            
            setDialogOpen(false);
            
            if (error) {
                throw new Error(error);
            }

            tg.openInvoice(invoiceUrl, async (status: 'paid' | 'cancelled' | 'failed' | 'pending') => {
                if (status === 'paid') {
                    const { userData: freshUserData } = await getUserData(user);
                    const currentRate = freshUserData.miningRate || 0;
                    const newRate = currentRate + boostAmount;
                    const updatedBoosts = [...(freshUserData.purchasedBoosts || []), boostId];

                    await saveUserData(user, { miningRate: newRate, purchasedBoosts: updatedBoosts });
                    setMiningRate(newRate);
                    setUserData(prev => prev ? { ...prev, miningRate: newRate, purchasedBoosts: updatedBoosts } : null);
                    showDialog("Boost Activated!", `Your mining rate has increased by ${boostAmount.toLocaleString()} points per day.`);
                } else {
                    showDialog("Payment Not Completed", "The payment was not completed. Please try again.");
                }
            });
        } catch (e: any) {
            setDialogOpen(false);
            console.error("Boost error:", e);
            showDialog("Error", `Could not process the boost payment: ${e.message}. Please try again later.`);
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
                                <p className="font-bold">+4,000 Points Daily</p>
                                <p className="text-sm text-muted-foreground flex items-center">
                                    Cost: 150 <Star className="w-4 h-4 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_1', 150, 4000, 'Booster Pack 1')} disabled={userData?.purchasedBoosts?.includes('boost_1')}>
                                {userData?.purchasedBoosts?.includes('boost_1') ? 'Active' : 'Activate'}
                            </Button>
                        </Card>
                        <Card className="p-4 flex justify-between items-center">
                            <div>
                                <p className="font-bold">+6,500 Points Daily</p>
                                <p className="text-sm text-muted-foreground flex items-center">
                                    Cost: 250 <Star className="w-4 h-4 ml-1 text-yellow-400" />
                                </p>
                            </div>
                            <Button onClick={() => handleBoost('boost_2', 250, 6500, 'Booster Pack 2')} disabled={userData?.purchasedBoosts?.includes('boost_2')}>
                               {userData?.purchasedBoosts?.includes('boost_2') ? 'Active' : 'Activate'}
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
