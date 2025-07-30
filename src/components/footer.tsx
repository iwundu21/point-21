
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Wallet, Gift, Users, Handshake, Trophy, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getUserData, getSocialTasks } from '@/lib/database';

// NOTE: Add your Telegram user ID here to see the Admin link
const ADMIN_IDS = [123, 12345, 6954452147]; 

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
}

const Footer = () => {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [availableTaskCount, setAvailableTaskCount] = useState(0);

  useEffect(() => {
    let user: TelegramUser | null = null;
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      if (tg.initDataUnsafe?.user) {
          user = tg.initDataUnsafe.user;
          tg.ready();
      }
    }
    
    if (user) {
        setTelegramUser(user);
        setIsAdmin(ADMIN_IDS.includes(user.id));
    } else {
        // Fallback for development, check against all mock IDs
        const mockUser: TelegramUser = { id: 123 };
        setTelegramUser(mockUser);
        setIsAdmin(ADMIN_IDS.includes(mockUser.id));
    }
  }, []);

  useEffect(() => {
    const checkTasks = async () => {
        if(telegramUser) {
            const userData = await getUserData(telegramUser);
            const socialTasks = await getSocialTasks();
            const completedCount = userData.completedSocialTasks?.length || 0;
            const availableCount = socialTasks.length - completedCount;

            if (availableCount > 0) {
                setAvailableTaskCount(availableCount);
            } else {
                setAvailableTaskCount(0);
            }
        }
    }
    checkTasks();
  }, [telegramUser]);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/tasks', label: 'Social', icon: Users, badge: availableTaskCount },
    { href: '/referral', label: 'Ref', icon: Handshake },
    { href: '/welcome-tasks', label: 'Wel', icon: Gift },
    { href: '/leaderboard', label: 'Leader', icon: Trophy },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const adminItem = { href: '/admin', label: 'Admin', icon: Shield };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-sm mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center text-sm w-full p-1">
              <item.icon className={cn("w-6 h-6 mb-1", isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn("text-xs", isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {item.label}
              </span>
              {item.badge && item.badge > 0 && !isActive && (
                <span className="absolute top-0 right-1/2 translate-x-3 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {item.badge}
                </span>
              )}
            </Link>
          );
        })}
         {isAdmin && (
            <Link key={adminItem.href} href={adminItem.href} className="flex flex-col items-center justify-center text-sm w-full p-1">
              <adminItem.icon className={cn("w-6 h-6 mb-1", pathname === adminItem.href ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn("text-xs", pathname === adminItem.href ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {adminItem.label}
              </span>
            </Link>
        )}
      </div>
    </footer>
  );
};

export default Footer;
