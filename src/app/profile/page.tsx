
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    is_premium?: boolean;
    photo_url?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      const telegramUser = tg.initDataUnsafe?.user;
      if (telegramUser) {
        setUser(telegramUser);
      }
    }
  }, []);

  const getInitials = () => {
    if (!user) return '';
    const firstNameInitial = user.first_name ? user.first_name[0] : '';
    const lastNameInitial = user.last_name ? user.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase();
  }

  const displayName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : '';

  if (!isClient || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
          <Skeleton className="w-32 h-32 rounded-full" />
          <div className="w-full max-w-sm space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <main className="flex-grow flex flex-col items-center p-4 space-y-8">
        <div className="flex flex-col items-center space-y-4 pt-8">
          <Avatar className="w-32 h-32 border-4 border-primary">
            <AvatarImage src={user.photo_url} alt={displayName} />
            <AvatarFallback className="text-4xl">{getInitials()}</AvatarFallback>
          </Avatar>
        </div>

        <Card className="w-full max-w-sm bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-center text-primary/90">User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
              <span className="font-semibold text-primary/80">Name</span>
              <span className="font-mono text-lg">{displayName}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
              <span className="font-semibold text-primary/80">Username</span>
              <span className="font-mono text-lg">@{user.username || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10">
              <span className="font-semibold text-primary/80">Telegram ID</span>
              <span className="font-mono text-lg">{user.id}</span>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
