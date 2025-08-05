
'use client';

import '@solana/wallet-adapter-react-ui/styles.css';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Wallet as WalletIcon, Save, AlertTriangle, Coins, Loader2, Bot } from 'lucide-react';
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
import { Alert, AlertDescription as AlertBoxDescription } from '@/components/ui/alert';
import { getVerificationStatus, getWalletAddress, getBalance, saveWalletAddress, findUserByWalletAddress } from '@/lib/database';
import { Separator } from '@/components/ui/separator';
import { v4 as uuidv4 } from 'uuid';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';


declare global {
  interface Window {
    Telegram: any;
  }
}

interface User {
    id: number | string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface WalletPageProps {}

const isValidSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};

export default function WalletPage({}: WalletPageProps) {
  const [savedAddress, setSavedAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { publicKey, connected } = useWallet();
  const walletAddress = useMemo(() => publicKey?.toBase58() || '', [publicKey]);


  useEffect(() => {
    const init = () => {
        let currentUser: User | null = null;
        if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
            const tg = window.Telegram.WebApp;
            currentUser = tg.initDataUnsafe.user;
            tg.ready();
        } else if (typeof window !== 'undefined') {
            let browserId = localStorage.getItem('browser_user_id');
            if (!browserId) {
                browserId = uuidv4();
                localStorage.setItem('browser_user_id', browserId);
            }
            currentUser = { id: browserId, first_name: 'Browser User' };
        }

        if (currentUser) {
            setUser(currentUser);
        } else {
            setIsLoading(false);
        }
    }
    init();
  }, []);

  const isBrowserUser = useMemo(() => user && typeof user.id !== 'number', [user]);

  useEffect(() => {
    const loadUserData = async () => {
        if (user) {
            setIsLoading(true);
            try {
                const [storedAddress, verificationStatus, userBalance] = await Promise.all([
                    getWalletAddress(user),
                    getVerificationStatus(user),
                    getBalance(user),
                ]);

                if (storedAddress) {
                    setSavedAddress(storedAddress);
                }
                setIsVerified(verificationStatus === 'verified');
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
    setIsSaving(true);
    
    // Determine which address to save based on user type
    const addressToSave = isBrowserUser ? walletAddress : manualAddress;
    const trimmedAddress = addressToSave.trim();

    if (!isValidSolanaAddress(trimmedAddress)) {
        toast({
            variant: 'destructive',
            title: 'Invalid Solana Address',
            description: 'Please enter or connect a valid Solana wallet address.',
        });
        setIsSaving(false);
        return;
    }


    if (trimmedAddress && user) {
        try {
            // Check for wallet uniqueness before saving
            const existingUser = await findUserByWalletAddress(trimmedAddress);
            const currentUserId = typeof user.id === 'number' ? `user_${user.id}` : `browser_${user.id}`;
            if (existingUser && existingUser.id !== currentUserId) {
                toast({
                    variant: 'destructive',
                    title: 'Wallet Address In Use',
                    description: 'This Solana wallet is already registered to another account.',
                });
                setIsSaving(false);
                return;
            }

            await saveWalletAddress(user, trimmedAddress);

            setTimeout(() => {
                setSavedAddress(trimmedAddress);
                toast({
                    title: 'Wallet Address Saved',
                    description: 'Your wallet address has been saved successfully.',
                });
                setIsSaving(false);
                setIsDialogOpen(false); // Close dialog on success
            }, 1000);

        } catch (error) {
            console.error("Error saving wallet address:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not save wallet address.',
            });
            setIsSaving(false);
        }
    } else {
        toast({
            variant: 'destructive',
            title: 'Invalid Address',
            description: 'Please provide a wallet address.',
        });
        setIsSaving(false);
    }
  };
  
  const handleTriggerClick = () => {
     if (!isVerified) {
       toast({
        variant: "destructive",
        title: "Verification Required",
        description: "Please verify your account on the profile page to save your wallet.",
        action: <Button onClick={() => router.push('/profile')}>Go to Profile</Button>,
       });
       return;
    }
    
    const addressToSave = isBrowserUser ? walletAddress : manualAddress;
    if (!isValidSolanaAddress(addressToSave.trim())) {
        toast({
            variant: 'destructive',
            title: 'Invalid Solana Address',
            description: 'Please enter a valid Solana wallet address.',
        });
        return;
    }
    
    setIsDialogOpen(true);
  }

  const truncateAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 14) return address;
    return `${address.slice(0, 7)}****${address.slice(-7)}`;
  }

  const renderWalletUI = () => {
    // ---- Browser User UI ----
    if (isBrowserUser) {
        return (
             <>
              <p className="text-sm text-muted-foreground mb-4">
                Connect and save your Solana wallet address to be eligible for future Exnus EXN airdrop snapshots.
              </p>

              {savedAddress ? (
                  <div className="space-y-4">
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <h4 className="font-semibold text-primary/90 mb-2">Saved Address:</h4>
                            <div className="flex items-center space-x-2">
                                <WalletIcon className="w-5 h-5 text-primary" />
                                <p className="text-sm text-muted-foreground font-mono">{truncateAddress(savedAddress)}</p>
                            </div>
                        </div>
                    </div>
              ) : connected ? (
                    <div className="flex flex-col space-y-4 items-center">
                        <p className="text-sm font-mono p-2 bg-primary/10 rounded-md break-all">{walletAddress}</p>
                        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <AlertDialogTrigger asChild>
                             <Button onClick={handleTriggerClick} disabled={!walletAddress.trim()} className="w-full">
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
                              </AlertDialogDescription>
                              <div className="font-bold break-all mt-2 p-2 bg-primary/10 rounded-md">{walletAddress}</div>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleSaveAddress} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSaving ? 'Saving...' : 'Confirm & Save'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      {!isVerified && (
                        <p className="text-xs text-destructive text-center">Please verify your account to save your wallet.</p>
                      )}
                  </div>
              ) : (
                  <div className="flex flex-col space-y-4 items-center">
                      <WalletMultiButton />
                  </div>
              )}
            </>
        )
    }

    // ---- Telegram User UI ----
    return (
        <>
            <p className="text-sm text-muted-foreground mb-4">
                Enter your Solana wallet address to be eligible for future Exnus EXN airdrop snapshots.
            </p>

            {savedAddress ? (
                 <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <h4 className="font-semibold text-primary/90 mb-2">Saved Address:</h4>
                    <div className="flex items-center space-x-2">
                        <WalletIcon className="w-5 h-5 text-primary" />
                        <p className="text-sm text-muted-foreground font-mono">{truncateAddress(savedAddress)}</p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col space-y-4 items-center">
                    <Input 
                        placeholder="Paste your Solana wallet address"
                        value={manualAddress}
                        onChange={(e) => setManualAddress(e.target.value)}
                        className="text-center"
                    />
                     <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button onClick={handleTriggerClick} disabled={!manualAddress.trim()} className="w-full">
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
                            </AlertDialogDescription>
                            <div className="font-bold break-all mt-2 p-2 bg-primary/10 rounded-md">{manualAddress}</div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleSaveAddress} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Saving...' : 'Confirm & Save'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {!isVerified && (
                        <p className="text-xs text-destructive text-center">Please verify your account to save your wallet.</p>
                    )}
                </div>
            )}
        </>
    )
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
          {isLoading ? null : (
             <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <WalletIcon className="w-8 h-8 text-primary" />
                        Wallet
                    </h1>
                </div>
                
                 <Card className="w-full bg-primary/5 border-primary/10">
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex items-center space-x-2">
                            <Coins className="w-6 h-6 text-gold" />
                            <span className="text-2xl font-bold text-gold">{balance.toLocaleString()} E-points</span>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                 <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Exnus EXN Airdrop</h3>
                        {renderWalletUI()}
                    </div>
                      <Alert variant="destructive" className="mt-12">
                          <AlertTriangle className="h-4 w-4" />
                          <CardTitle className="text-destructive text-base">Important Notice</CardTitle>
                          <AlertBoxDescription>
                          Your wallet address is permanently saved and cannot be changed. Please ensure it is correct.
                          </AlertBoxDescription>
                      </Alert>
                </div>
            </div>
          )}
        </main>
       </div>
      <Footer />
    </div>
  );
}
