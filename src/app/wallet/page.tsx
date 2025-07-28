
'use client';

import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet as WalletIcon } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col items-center justify-center p-4 mt-8">
            <Card className="w-full max-w-sm bg-primary/5 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <WalletIcon className="w-6 h-6" />
                Wallet
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center">This page is under construction.</p>
            </CardContent>
            </Card>
        </main>
       </div>
      <Footer />
    </div>
  );
}
