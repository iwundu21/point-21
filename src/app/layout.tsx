
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SpeedInsights } from "@vercel/speed-insights/next"
import WalletProvider from '@/components/wallet-provider';

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
      </head>
      <body className="font-body antialiased">
        <WalletProvider>
            {children}
            <Toaster />
            <SpeedInsights/>
        </WalletProvider>
      </body>
    </html>
  );
}
