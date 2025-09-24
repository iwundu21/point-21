
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getTotalUsersCount } from '@/lib/database';
import { Loader2 } from 'lucide-react';
import LoadingDots from './loading-dots';

export default function TelegramGate() {
  const [isFull, setIsFull] = useState<boolean | null>(null);
  const AIRDROP_CAP = 300000;

  useEffect(() => {
    const checkCapacity = async () => {
        const totalUsers = await getTotalUsersCount();
        setIsFull(totalUsers >= AIRDROP_CAP);
    };
    checkCapacity();
  }, []);


  if (isFull === null) {
    return (
      <div className="flex justify-center items-center h-screen">
          <LoadingDots />
      </div>
    );
  }

  if (isFull) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <Card className="max-w-md w-full text-center">
              <CardHeader>
                  <div className="flex justify-center mb-4">
                      <Info className="w-16 h-16 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Airdrop Capacity Reached</CardTitle>
                  <CardDescription>
                      All 300,000 slots for the airdrop have been filled. Thank you for your interest!
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground">
                      Follow us on our social channels to stay updated on future opportunities.
                  </p>
              </CardContent>
          </Card>
      </div>
    );
  }


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
                    <h3 className="font-semibold text-foreground mb-2">How to Recover Your Browser EXN:</h3>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>Click the button below to open the app in Telegram.</li>
                        <li>You will be prompted to link your browser account.</li>
                        <li>Enter the Solana wallet address you used here.</li>
                        <li>Your EXN will be automatically transferred!</li>
                    </ol>
                </div>
                <a href="https://t.me/Exnuspoint_bot" className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                    <Bot className="w-5 h-5 mr-2"/>
                    Open in Telegram & Recover EXN
                </a>
            </CardContent>
        </Card>
    </div>
  );
}

    