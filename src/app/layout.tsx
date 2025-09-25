
import type { Metadata } from 'next';
import './globals.css';
import { SpeedInsights } from "@vercel/speed-insights/next";
import WalletProvider from '@/components/wallet-provider';
import { LoaderProvider } from '@/components/loader-provider';
import { Toaster } from '@/components/ui/toaster';
import Body from '@/components/body';

export const metadata: Metadata = {
  title: 'Exnus Points',
  description: 'Your gateway to the Exnus ecosystem.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <Body>
        <LoaderProvider>
            <WalletProvider>
                {children}
                <Toaster />
                <SpeedInsights/>
            </WalletProvider>
        </LoaderProvider>
      </Body>
    </html>
  );
}
