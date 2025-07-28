
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Gift, Copy } from 'lucide-react';
import { getUserData } from '@/lib/database';
import { Skeleton } from '@/components/ui/skeleton';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    username?: string;
}

export default function ReferralPage() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [referralLink, setReferralLink] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [friendsReferred, setFriendsReferred] = useState(0); // Mock data
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const telegramUser = tg.initDataUnsafe?.user;
        if (telegramUser) {
            setUser(telegramUser);
            // In a real app, you would fetch this from your backend.
            const userData = getUserData(telegramUser); 
            // Generate a referral link. In a real app, this might come from a backend.
            const link = `https://t.me/Exnuspoint_bot?start=${telegramUser.id}`;
            setReferralLink(link);
            setFriendsReferred(userData.balance > 1000 ? 5 : 0); // Example logic
        }
    }
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: 'Link Copied!',
      description: 'Your referral link has been copied to the clipboard.',
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
             <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Gift className="w-8 h-8" />
                        Referral Program
                    </h1>
                </div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle>Invite Friends, Earn E-points</CardTitle>
                    <CardDescription>
                      Share your unique referral link with friends. You'll both receive bonuses when they sign up and start forging!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                        <p className="text-sm text-muted-foreground break-all">{referralLink}</p>
                    </div>
                    <Button onClick={handleCopyLink} className="w-full">
                      <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </Button>
                  </CardContent>
                </Card>

                 <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                        <CardTitle>Your Referral Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex justify-between items-center">
                           <span className="text-muted-foreground">Friends Referred:</span>
                           <span className="font-bold text-xl">{friendsReferred}</span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-muted-foreground">Bonus Earned:</span>
                           <span className="font-bold text-xl">{(friendsReferred * 500).toLocaleString()} E-points</span>
                       </div>
                    </CardContent>
                 </Card>
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}
