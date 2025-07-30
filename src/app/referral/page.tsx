
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Gift, Copy, MessageSquarePlus, CheckCircle, Loader2 } from 'lucide-react';
import { getUserData, saveUserData, applyReferralBonus } from '@/lib/database';
import FullScreenLoader from '@/components/full-screen-loader';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    username?: string;
    first_name: string;
    last_name?: string;
    language_code: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface ReferralPageProps {}

export default function ReferralPage({}: ReferralPageProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [friendsReferred, setFriendsReferred] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [bonusApplied, setBonusApplied] = useState(false);
  const { toast } = useToast();

  const botUrl = "https://t.me/Exnuspoint_bot";
  const shareMessage = `Join me on Exnus Points and get a 50 point bonus! ✨\n\nUse my referral code to get started: ${referralCode}\n\n${botUrl}`;


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
        setUser(telegramUser);
      } else {
        // Fallback for development
        const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en' };
        setUser(mockUser);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
        if (user) {
            setIsLoading(true);
            try {
                const userData = await getUserData(user); 
                setReferralCode(userData.referralCode || '');
                setFriendsReferred(userData.referrals || 0);
                setBonusApplied(userData.referralBonusApplied);
            } catch (error) {
                console.error("Failed to load user data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadUserData();
  }, [user]);

  const handleCopy = (textToCopy: string, successMessage: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: 'Copied to Clipboard!',
      description: successMessage,
    });
  };

  const handleRedeemCode = async () => {
    if (!user || !enteredCode.trim()) return;

    setIsRedeeming(true);

    try {
        const currentUserData = await getUserData(user);
        if (currentUserData.referralBonusApplied) {
            toast({ variant: 'destructive', title: 'Bonus Already Applied', description: 'You have already redeemed a referral bonus.' });
            setIsRedeeming(false);
            return;
        }

        if(currentUserData.referralCode?.toLowerCase() === enteredCode.trim().toLowerCase()){
            toast({ variant: 'destructive', title: 'Invalid Code', description: 'You cannot use your own referral code.' });
            setIsRedeeming(false);
            return;
        }

        const updatedUser = await applyReferralBonus(user, enteredCode.trim());

        if (updatedUser) {
            setBonusApplied(true);
            toast({ title: 'Success!', description: 'You have received a 50 E-point bonus!' });
        } else {
            toast({ variant: 'destructive', title: 'Invalid Code', description: 'The referral code you entered is not valid or does not exist.' });
        }
    } catch (error) {
        console.error("Redemption error:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred during redemption.' });
    } finally {
        setIsRedeeming(false);
        setEnteredCode('');
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
            {isLoading ? <FullScreenLoader /> : (
                <div className="w-full max-w-sm mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Gift className="w-8 h-8 text-primary" />
                        Referral Program
                    </h1>
                </div>

                { !bonusApplied && (
                    <>
                    <div className="space-y-4 text-center">
                        <h2 className="text-xl font-semibold">Have a referral code?</h2>
                        <p className="text-sm text-muted-foreground">
                            Enter the code from your friend to get a <strong className="text-gray-400">50 E-point</strong> bonus.
                        </p>
                        <div className="flex w-full max-w-sm items-center space-x-2">
                           <Input
                                type="text"
                                placeholder="Enter code"
                                value={enteredCode}
                                onChange={(e) => setEnteredCode(e.target.value)}
                                disabled={isRedeeming}
                            />
                            <Button type="submit" onClick={handleRedeemCode} disabled={isRedeeming || !enteredCode.trim()}>
                                {isRedeeming ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Redeem'}
                            </Button>
                        </div>
                    </div>
                    <Separator className="w-full" />
                    </>
                )}

                { bonusApplied && (
                    <div className="p-4 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg flex items-center justify-center gap-2">
                       <CheckCircle className="w-5 h-5" />
                       <p className="font-semibold text-sm">Referral bonus successfully applied!</p>
                    </div>
                )}

                <div className="space-y-4 text-center">
                  <h2 className="text-xl font-semibold">Invite Friends, Earn E-points</h2>
                  <p className="text-sm text-muted-foreground">
                    Share your unique referral code with friends. When they sign up, you'll earn <strong className="text-gray-400">200 E-points</strong>, and they'll get a <strong className="text-gray-400">50 E-point</strong> head start! It's a win-win.
                  </p>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center cursor-pointer" onClick={() => handleCopy(referralCode, 'Your referral code has been copied.')}>
                      <p className="text-xs text-primary/80 mb-1">Your Unique Code</p>
                      <p className="text-2xl font-bold tracking-widest text-primary/90">{referralCode}</p>
                  </div>
                  <Button onClick={() => handleCopy(referralCode, 'Your referral code has been copied.')} className="w-full" variant="outline">
                    <Copy className="mr-2 h-4 w-4" /> Copy Code
                  </Button>
                </div>
                
                <Separator className="w-full" />

                 <div className="space-y-4 text-center">
                  <h2 className="text-xl font-semibold">Share a Message</h2>
                  <p className="text-sm text-muted-foreground">
                      Want to make it even easier? Copy the message below and send it to your friends.
                  </p>
                   <div className="p-4 bg-background rounded-lg border border-primary/20 text-sm text-foreground whitespace-pre-line text-left">
                       {shareMessage}
                   </div>
                   <Button onClick={() => handleCopy(shareMessage, 'The referral message has been copied.')} className="w-full mt-4">
                       <MessageSquarePlus className="mr-2 h-4 w-4" /> Copy Message
                   </Button>
                </div>

                <Separator className="w-full" />

                 <div className="space-y-4 text-center">
                    <h2 className="text-xl font-semibold">Your Referral Stats</h2>
                    <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                       <span className="text-muted-foreground">Friends Referred:</span>
                       <span className="font-bold text-xl">{friendsReferred}</span>
                   </div>
                   <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                       <span className="text-muted-foreground">Bonus Earned:</span>
                       <span className="font-bold text-xl text-gray-400">{(friendsReferred * 200).toLocaleString()} E-points</span>
                   </div>
                 </div>
            </div>
            )}
        </main>
       </div>
      <Footer />
    </div>
  );
}

    