'use client';
import { useState, useEffect } from 'react';
import UserCard from '@/components/user-card';
import BalanceCard from '@/components/balance-card';
import MiningCircle from '@/components/mining-circle';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [balance, setBalance] = useState(0);
  const [isMiningActive, setIsMiningActive] = useState(false);
  const [miningEndTime, setMiningEndTime] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedBalance = localStorage.getItem('exnus_balance');
    const savedEndTime = localStorage.getItem('exnus_miningEndTime');
    
    if (savedBalance) setBalance(JSON.parse(savedBalance));
    
    if (savedEndTime) {
        const endTime = JSON.parse(savedEndTime);
        if (endTime > Date.now()) {
            setIsMiningActive(true);
            setMiningEndTime(endTime);
        } else {
            // Award points for a session that ended while the user was away
            setBalance(prev => prev + 1000);
            localStorage.removeItem('exnus_miningEndTime');
        }
    }
  }, []);

  useEffect(() => {
      if (isClient) {
          localStorage.setItem('exnus_balance', JSON.stringify(balance));
          if (miningEndTime) {
              localStorage.setItem('exnus_miningEndTime', JSON.stringify(miningEndTime));
          } else {
              localStorage.removeItem('exnus_miningEndTime');
          }
      }
  }, [balance, miningEndTime, isClient]);

  const handleActivateMining = () => {
    // 24 hours in milliseconds
    const endTime = Date.now() + 24 * 60 * 60 * 1000;
    setIsMiningActive(true);
    setMiningEndTime(endTime);
  };

  const handleSessionEnd = () => {
    setBalance(prev => prev + 1000);
    setIsMiningActive(false);
    setMiningEndTime(null);
    setShowPointsAnimation(true);
    setTimeout(() => setShowPointsAnimation(false), 2000);
  };
  
  // Mock user data as we can't fetch from Telegram API
  const user = {
    username: 'telegram_user',
    id: '123456789'
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-between min-h-screen bg-background p-4 space-y-8">
        <Skeleton className="w-full max-w-sm h-36 rounded-lg" />
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-64 h-64 rounded-full" />
          <Skeleton className="w-48 h-6" />
        </div>
        <Skeleton className="w-full max-w-sm h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <main className="flex flex-col items-center justify-between min-h-screen bg-background text-foreground p-4 space-y-8 font-body">
      <header className="w-full max-w-sm">
        <UserCard username={user.username} userId={user.id} />
      </header>
      
      <div className="flex-grow flex flex-col items-center justify-center space-y-4">
        <MiningCircle 
          isActive={isMiningActive}
          endTime={miningEndTime}
          onActivate={handleActivateMining}
          onSessionEnd={handleSessionEnd}
        />
      </div>

      <footer className="w-full max-w-sm">
        <BalanceCard balance={balance} animating={showPointsAnimation} />
      </footer>
    </main>
  );
}
