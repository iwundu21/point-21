
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, Wallet, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

const Footer = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/referral', label: 'Referral', icon: Gift },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
      <div className="flex justify-around items-center h-16 max-w-sm mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center justify-center text-sm w-full">
              <item.icon className={cn("w-6 h-6 mb-1", isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn(isActive ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </footer>
  );
};

export default Footer;
