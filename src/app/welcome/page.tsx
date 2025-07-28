
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { saveUserData, getUserData, findUserByReferralCode, applyReferralBonus } from '@/lib/database';
import { FaTelegramPlane, FaTwitter, FaDiscord } from 'react-icons/fa';
import { Loader2, Check } from 'lucide-react';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    first_name: string;
    username?: string;
}

const socialTasks = [
  { id: 'task-twitter', label: 'Follow us on X', icon: <FaTwitter className="w-5 h-5" />, href: 'https://x.com/your-profile' },
  { id: 'task-telegram', label: 'Subscribe on Telegram', icon: <FaTelegramPlane className="w-5 h-5" />, href: 'https://t.me/your-channel' },
  { id: 'task-discord', label: 'Join our Discord', icon: <FaDiscord className="w-5 h-5" />, href: 'https://discord.gg/your-invite' },
];

type TaskStatus = 'idle' | 'verifying' | 'verified';

export default function WelcomePage() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(
    socialTasks.reduce((acc, task) => ({ ...acc, [task.id]: 'idle' }), {})
  );
  const [allTasksDone, setAllTasksDone] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      const telegramUser = tg.initDataUnsafe?.user;

      if (telegramUser) {
        setUser(telegramUser);
        const userData = getUserData(telegramUser);
        if (userData.onboardingCompleted) {
            router.replace('/');
        } else {
            const refFromUrl = searchParams.get('ref');
            if(refFromUrl) {
                setReferralCode(refFromUrl);
            }
            setIsLoading(false);
        }
      } else {
        setIsLoading(false);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not identify user.' });
      }
    } else {
        setIsLoading(false);
    }
  }, [router, searchParams, toast]);

  useEffect(() => {
    const allDone = socialTasks.every(task => taskStatuses[task.id] === 'verified');
    setAllTasksDone(allDone);
  }, [taskStatuses]);

  const handleTaskClick = (taskId: string, href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
    
    setTaskStatuses(prev => ({ ...prev, [taskId]: 'verifying' }));

    setTimeout(() => {
      setTaskStatuses(prev => ({ ...prev, [taskId]: 'verified' }));
    }, 8000);
  };

  const handleContinue = () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not found. Please restart the app.' });
      return;
    }
    
    setIsFinishing(true);

    let userData = getUserData(user);
    let currentBalance = userData.balance || 0;

    // Handle referral logic
    if (referralCode.trim() && !userData.referredBy && !userData.referralBonusApplied) {
        const referrerData = findUserByReferralCode(referralCode.trim());

        if (referrerData && referrerData.telegramUser?.id !== user.id) {
            // Award new user
            currentBalance += 50;
            toast({
                title: "Referral Bonus!",
                description: "You've received 50 E-points for using a referral code.",
            });

            userData.referralBonusApplied = true;
            userData.referredBy = referralCode.trim();
            
            // Update referrer's data
            applyReferralBonus(referralCode.trim());
        } else {
             toast({
                variant: "destructive",
                title: "Invalid Referral Code",
                description: "The code you entered is not valid or belongs to you.",
            });
        }
    }
    
    // Save updated data and mark onboarding as complete
    saveUserData(user, {
        ...userData,
        balance: currentBalance,
        onboardingCompleted: true,
    });

    // Navigate to home page
    router.replace('/');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4">Loading...</p>
      </div>
    );
  }

  const renderTaskButtonContent = (taskId: string, label: string, icon: React.ReactNode) => {
    const status = taskStatuses[taskId];
    switch (status) {
        case 'verifying':
            return (
                <>
                    <Loader2 className="animate-spin" /> Verifying...
                </>
            );
        case 'verified':
            return (
                <>
                    <Check /> Completed
                </>
            );
        case 'idle':
        default:
            return (
                <>
                    {icon} {label}
                </>
            );
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle>Welcome to Aetherium Points!</CardTitle>
            <CardDescription>
              Complete a few simple tasks to get started and unlock your full access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-center text-primary/90">1. Complete Social Tasks</h3>
              {socialTasks.map((task) => (
                <Button
                    key={task.id}
                    onClick={() => handleTaskClick(task.id, task.href)}
                    disabled={taskStatuses[task.id] !== 'idle'}
                    className="w-full justify-center"
                    variant={taskStatuses[task.id] === 'verified' ? 'secondary' : 'outline'}
                >
                    {renderTaskButtonContent(task.id, task.label, task.icon)}
                </Button>
              ))}
            </div>

            {allTasksDone && (
              <div className="space-y-4 pt-4 border-t border-primary/10 animate-fade-in">
                <h3 className="font-semibold text-center text-primary/90">2. Enter Referral Code (Optional)</h3>
                <Input
                  id="referral-code"
                  placeholder="Enter code"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="bg-background/80"
                />
              </div>
            )}

            <Button onClick={handleContinue} disabled={!allTasksDone || isFinishing} className="w-full">
              {isFinishing ? <Loader2 className="animate-spin" /> : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
