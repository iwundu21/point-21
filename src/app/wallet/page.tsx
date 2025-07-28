
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet as WalletIcon, Save } from 'lucide-react';

export default function WalletPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState('');
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const storedAddress = localStorage.getItem('exnus_wallet');
    if (storedAddress) {
      setSavedAddress(storedAddress);
      setWalletAddress(storedAddress);
    }
  }, []);

  const handleSaveAddress = () => {
    if (walletAddress.trim()) {
      localStorage.setItem('exnus_wallet', walletAddress);
      setSavedAddress(walletAddress);
      toast({
        title: 'Wallet Address Saved',
        description: 'Your wallet address has been saved successfully.',
      });
    } else {
        toast({
            variant: 'destructive',
            title: 'Invalid Address',
            description: 'Please enter a valid wallet address.',
        });
    }
  };

  if (!isClient) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-20"></div>
            <Footer />
        </div>
    )
  }

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
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Exnus EXN Airdrop</h3>
                        <CardDescription className="mb-4">
                            Save your wallet address to be eligible for future Exnus EXN airdrop snapshots.
                        </CardDescription>
                        <div className="flex flex-col space-y-2">
                            <Input 
                                type="text"
                                placeholder="Enter your wallet address"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                className="bg-background/80"
                            />
                            <Button onClick={handleSaveAddress}>
                                <Save className="mr-2 h-4 w-4" /> Save Address
                            </Button>
                        </div>
                    </div>
                    
                    {savedAddress && (
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <h4 className="font-semibold text-primary/90">Saved Address:</h4>
                            <p className="text-sm text-muted-foreground break-all">{savedAddress}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
       </div>
      <Footer />
    </div>
  );
}
