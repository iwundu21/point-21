
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Gift, Copy, MessageSquarePlus, CheckCircle, Loader2 } from 'lucide-react';
import { getUserData, saveUserData, applyReferralBonus } from '@/lib/database';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
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
import { TelegramUser } from '@/lib/user-utils';
import LoadingDots from '@/components/loading-dots';

interface ReferralPageProps {}

export default function ReferralPage({}: ReferralPageProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [friendsReferred, setFriendsReferred] = useState(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [bonusApplied, setBonusApplied] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogDescription, setDialogDescription] = useState('');

  const botUrl = "https://t.me/Exnuspoint_bot";
  const shareMessage = `🚀 Join me on the Exnus mission! Get a 100 Points welcome bonus when you use my code. ✨\n\nThe official TGE is coming in December 2025 - let's start earning together!\n\nMy referral code: ${referralCode}\n\nJoin here: ${botUrl}`;

  const showDialog = (title: string, description: string) => {
    setDialogTitle(title);
    setDialogDescription(description);
    setDialogOpen(true);
  };


  useEffect(() => {
    const init = () => {
      let currentUser: TelegramUser | null = null;
      if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
        const tg = window.Telegram.WebApp;
        currentUser = tg.initDataUnsafe.user;
        tg.ready();
      } else if (typeof window !== 'undefined') {
        let browserId = localStorage.getItem('browser_user_id');
        if (!browserId) {
          browserId = uuidv4();
          localStorage.setItem('browser_user_id', browserId);
        }
        currentUser = { id: browserId, first_name: 'Browser User' };
      }
      
      if (currentUser) {
        setUser(currentUser);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
        if (user) {
            setIsLoading(true);
            try {
                const { userData } = await getUserData(user); 
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
    showDialog('Copied to Clipboard!', successMessage);
  };

  const handleRedeemCode = async () => {
    if (!user || !enteredCode.trim()) return;

    setIsRedeeming(true);

    try {
        const { userData: currentUserData } = await getUserData(user);
        if (currentUserData.referralBonusApplied) {
            showDialog('Bonus Already Applied', 'You have already redeemed a referral bonus.');
            setIsRedeeming(false);
            return;
        }

        if(currentUserData.referralCode?.toLowerCase() === enteredCode.trim().toLowerCase()){
            showDialog('Invalid Code', 'You cannot use your own referral code.');
            setIsRedeeming(false);
            return;
        }

        const updatedUser = await applyReferralBonus(user, enteredCode.trim());

        if (updatedUser) {
            setBonusApplied(true);
            showDialog('Success!', 'You have received a 100 Points bonus!');
        } else {
            showDialog('Invalid Code', 'The referral code you entered is not valid or does not exist.');
        }
    } catch (error) {
        console.error("Redemption error:", error);
        showDialog('Error', 'An unexpected error occurred during redemption.');
    } finally {
        setIsRedeeming(false);
        setEnteredCode('');
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
            {isLoading ? null : (
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
                            Enter the code from your friend to get a <strong className="text-gold">100 Points</strong> bonus.
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
                                {isRedeeming ? <LoadingDots /> : 'Redeem'}
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
                  <h2 className="text-xl font-semibold">Invite Friends, Earn Points</h2>
                  <p className="text-sm text-muted-foreground">
                    Share your unique referral code with friends. When they sign up, you'll earn <strong className="text-gold">300 Points</strong>, and they'll get a <strong className="text-gold">100 Points</strong> head start! It's a win-win.
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
                       <span className="font-bold text-xl text-gold">{(friendsReferred * 300).toLocaleString()} Points</span>
                   </div>
                 </div>
            </div>
            )}
        </main>
       </div>
      <Footer />
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                    {dialogDescription}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setDialogOpen(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}
