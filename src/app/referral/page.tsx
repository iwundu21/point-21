
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Gift, Copy, MessageSquarePlus } from 'lucide-react';
import { getUserData, saveUserData } from '@/lib/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    username?: string;
}

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

interface ReferralPageProps {}

export default function ReferralPage({}: ReferralPageProps) {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [friendsReferred, setFriendsReferred] = useState(0);
  const { toast } = useToast();

  const botUrl = "https://t.me/Exnuspoint_bot";
  const shareMessage = `Join me on Exnus Points and get a 50 point bonus! ✨\n\nUse my referral code to get started: ${referralCode}\n\n${botUrl}`;


  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const telegramUser = tg.initDataUnsafe?.user;
        if (telegramUser) {
            setUser(telegramUser);
            const userData = getUserData(telegramUser); 
            
            let userReferralCode = userData.referralCode;
            if (!userReferralCode) {
                userReferralCode = generateReferralCode();
                saveUserData(telegramUser, { referralCode: userReferralCode });
            }

            setReferralCode(userReferralCode);
            setFriendsReferred(userData.referrals || 0);
        }
    }
  }, []);

  const handleCopy = (textToCopy: string, successMessage: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: 'Copied to Clipboard!',
      description: successMessage,
    });
  };

  if (!isClient || !user) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-20">
              <main className="flex-grow flex flex-col p-4 mt-8">
                <div className="w-full max-w-sm mx-auto space-y-6">
                    <div className="text-center">
                        <Skeleton className="h-8 w-32 mx-auto" />
                    </div>
                     <Skeleton className="h-48 w-full" />
                     <Skeleton className="h-32 w-full" />
                </div>
              </main>
            </div>
            <Footer />
        </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8">
             <div className="w-full max-w-sm mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Gift className="w-8 h-8" />
                        Referral Program
                    </h1>
                </div>

                <div className="space-y-4 text-center">
                  <h2 className="text-xl font-semibold">Invite Friends, Earn E-points</h2>
                  <p className="text-sm text-muted-foreground">
                    Share your unique referral code with friends. When they sign up, you'll earn <strong>200 E-points</strong>, and they'll get a <strong>50 E-point</strong> head start! It's a win-win.
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
                       <span className="font-bold text-xl">{(friendsReferred * 200).toLocaleString()} E-points</span>
                   </div>
                 </div>
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}
