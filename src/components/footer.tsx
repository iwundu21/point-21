
'use client';

import { usePathname } from 'next/navigation';
import { Home, User, Wallet, Gift, Users, Handshake, Trophy, Shield, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { getUserData, getSocialTasks } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { useLoader } from './loader-provider';

// NOTE: Add your Telegram user ID here to see the Admin link
const ADMIN_IDS = [123, 12345, 6954452147]; 

declare global {
  interface Window {
    Telegram: any;
  }
}

interface User {
    id: number | string;
}

const Footer = () => {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableTaskCount, setAvailableTaskCount] = useState(0);
  const { showLoader } = useLoader();

  useEffect(() => {
    let user: User | null = null;
    if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
      const tg = window.Telegram.WebApp;
      user = tg.initDataUnsafe.user;
      tg.ready();
      if(user) setIsAdmin(ADMIN_IDS.includes(user.id as number));
    } else if (typeof window !== 'undefined') {
        let browserId = localStorage.getItem('browser_user_id');
        if (browserId) {
            user = { id: browserId };
        }
    }
    
    if (user) {
        setCurrentUser(user);
        if (typeof user.id === 'number') {
            setIsAdmin(ADMIN_IDS.includes(user.id));
        }
    } else {
        const mockUser: User = { id: 123 }; // for dev fallback
        setCurrentUser(mockUser);
        if (typeof mockUser.id === 'number') {
           setIsAdmin(ADMIN_IDS.includes(mockUser.id));
        }
    }
  }, []);

  useEffect(() => {
    const checkTasks = async () => {
        if(currentUser) {
            const { userData } = await getUserData(currentUser);
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
  }, [currentUser]);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/tasks', label: 'Social', icon: Users, badge: availableTaskCount },
    { href: '/referral', label: 'Ref', icon: Handshake },
    { href: '/welcome-tasks', label: 'Wel', icon: Gift },
    { href: '/leaderboard', label: 'Leader', icon: Trophy },
    { href: '/wallet', label: 'Airdrop', icon: Coins },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const adminItem = { href: '/admin', label: 'Admin', icon: Shield };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-sm mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <div key={item.href} onClick={() => showLoader(item.href)} className="relative flex flex-col items-center justify-center text-sm w-full p-1 cursor-pointer">
              <item.icon className={cn("w-6 h-6 mb-1", isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn("text-xs", isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {item.label}
              </span>
              {item.badge && item.badge > 0 && !isActive && (
                <span className="absolute top-0 right-1/2 translate-x-3 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center font-bold">
                    {item.badge}
                </span>
              )}
            </div>
          );
        })}
         {isAdmin && (
            <div onClick={() => showLoader(adminItem.href)} className="flex flex-col items-center justify-center text-sm w-full p-1 cursor-pointer">
              <adminItem.icon className={cn("w-6 h-6 mb-1", pathname === adminItem.href ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn("text-xs", pathname === adminItem.href ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {adminItem.label}
              </span>
            </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
