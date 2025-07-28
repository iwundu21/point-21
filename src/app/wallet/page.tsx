
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet as WalletIcon, Save, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const truncateAddress = (address: string) => {
    if (address.length < 14) return address;
    return `${address.slice(0, 7)}****${address.slice(-7)}`;
  }

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
        <main className="flex-grow flex flex-col p-4 mt-8">
             <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <WalletIcon className="w-8 h-8" />
                        Wallet
                    </h1>
                </div>

                <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Exnus EXN Airdrop</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                          Save your Solana wallet address to be eligible for future Exnus EXN airdrop snapshots.
                      </p>

                      {!savedAddress ? (
                          <div className="flex flex-col space-y-2">
                              <Input
                                  type="text"
                                  placeholder="Enter your Solana wallet address"
                                  value={walletAddress}
                                  onChange={(e) => setWalletAddress(e.target.value)}
                                  className="bg-background/80"
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button disabled={!walletAddress.trim()}>
                                      <Save className="mr-2 h-4 w-4" /> Save Address
                                   </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                      <AlertTriangle className="text-destructive" /> Are you absolutely sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. Please double-check your wallet address before saving. An incorrect address may result in permanent loss of airdrops.
                                      <p className="font-bold break-all mt-2 p-2 bg-primary/10 rounded-md">{walletAddress}</p>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSaveAddress}>Confirm & Save</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                          </div>
                      ) : (
                           <div className="space-y-4">
                              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                                  <h4 className="font-semibold text-primary/90 mb-2">Saved Address:</h4>
                                  <div className="flex items-center space-x-2">
                                      <WalletIcon className="w-5 h-5 text-muted-foreground" />
                                      <p className="text-sm text-muted-foreground font-mono">{truncateAddress(savedAddress)}</p>
                                  </div>
                              </div>
                          </div>
                      )}
                    </div>

                     <Alert variant="destructive" className="mt-12">
                        <AlertTriangle className="h-4 w-4" />
                        <CardTitle className="text-destructive text-base">Important Notice</CardTitle>
                        <AlertDescription>
                        Your wallet address is permanently saved and cannot be changed. Please ensure it is correct.
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}
