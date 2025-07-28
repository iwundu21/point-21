
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

  const displayName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Anonymous';

  if (!isClient || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
        <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
          <Skeleton className="w-full max-w-sm h-48" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      <main className="flex-grow flex flex-col items-center p-4 space-y-8 mt-8">
        <Card className="w-full max-w-sm bg-primary/5 border-primary/20 p-6">
            <CardContent className="flex items-center space-x-6">
                <Avatar className="w-24 h-24 border-4 border-primary">
                    <AvatarImage src={user.photo_url} alt={displayName} />
                    <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <p className="text-sm text-muted-foreground">@{user.username || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground pt-2">ID: {user.id}</p>
                </div>
            </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
