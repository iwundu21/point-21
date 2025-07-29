
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wallet as WalletIcon, Save, AlertTriangle, Coins } from 'lucide-react';
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
import { getVerificationStatus, getWalletAddress, saveWalletAddress, getBalance } from '@/lib/database';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface WalletPageProps {}

export default function WalletPage({}: WalletPageProps) {
  const [walletAddress, setWalletAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [balance, setBalance] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = () => {
        let telegramUser: TelegramUser | null = null;
        if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            if (tg.initDataUnsafe?.user) {
                telegramUser = tg.initDataUnsafe.user;
                tg.ready();
            }
        }

        if (telegramUser) {
            setUser(telegramUser);
        } else {
            const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en' };
            setUser(mockUser);
        }
    }
    init();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
        if (user) {
            setIsLoading(true);
            try {
                const storedAddress = await getWalletAddress(user);
                if (storedAddress) {
                    setSavedAddress(storedAddress);
                    setWalletAddress(storedAddress);
                }
                const verificationStatus = await getVerificationStatus(user);
                setIsVerified(verificationStatus === 'verified');
                const userBalance = await getBalance(user);
                setBalance(userBalance);
            } catch (error) {
                console.error("Failed to load user wallet data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadUserData();
  }, [user]);

  const handleSaveAddress = async () => {
    if (!isVerified) {
       toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Please verify your account on the profile page to save your wallet.",
        action: <Button onClick={() => router.push('/profile')}>Go to Profile</Button>,
       });
       return;
    }
    if (walletAddress.trim() && user) {
      await saveWalletAddress(user, walletAddress);
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

  if (isLoading || !user) {
    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-20 p-4 mt-8 max-w-sm mx-auto w-full">
                <div className="space-y-6">
                    <Skeleton className="h-8 w-24 mx-auto" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-1" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
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
                
                 <Card className="w-full bg-primary/5 border-primary/10">
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium text-yellow-400/80">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex items-center space-x-2">
                            <Coins className="w-6 h-6 text-yellow-400" />
                            <span className="text-2xl font-bold text-yellow-400">{balance.toLocaleString()} E-points</span>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

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
                                  disabled={!isVerified}
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                   <Button disabled={!walletAddress.trim() || !isVerified}>
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
                              {!isVerified && (
                                <p className="text-xs text-destructive text-center">Please verify your account to save your wallet.</p>
                              )}
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
