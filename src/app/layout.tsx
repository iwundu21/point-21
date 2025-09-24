'use client';

import { usePathname } from 'next/navigation';
import type { Metadata } from 'next';
import './globals.css';
import { SpeedInsights } from "@vercel/speed-insights/next";
import WalletProvider from '@/components/wallet-provider';
import { LoaderProvider } from '@/components/loader-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

// Metadata can't be exported from a client component, but we can define it here.
// For dynamic metadata, you would need a different approach.
// export const metadata: Metadata = {
//   title: 'Exnus Points',
//   description: 'Your gateway to the Exnus ecosystem.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Exnus Points</title>
        <meta name="description" content="Your gateway to the Exnus ecosystem." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className={cn(
        "font-body antialiased"
      )}>
        <LoaderProvider>
            <WalletProvider>
                {children}
                <Toaster />
                <SpeedInsights/>
            </WalletProvider>
        </LoaderProvider>
      </body>
    </html>
  );
}
