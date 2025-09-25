
'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Body({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
      <body className={cn(
        "font-body antialiased"
      )}>
        {children}
      </body>
  );
}
