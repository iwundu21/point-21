
'use client';

import '@solana/wallet-adapter-react-ui/styles.css';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet as WalletIcon, Save, AlertTriangle, Coins, Loader2, Bot, Info, CheckCircle, XCircle, UserCheck, Star, Zap } from 'lucide-react';
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
import { getUserData, saveWalletAddress, findUserByWalletAddress, UserData, getUserId } from '@/lib/database';
import { Separator } from '@/components/ui/separator';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { TelegramUser } from '@/lib/user-utils';


const isValidSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};

const EligibilityItem = ({ text, isMet }: { text: string, isMet: boolean }) => (
    <div className="flex items-center space-x-3">
        {isMet ? (
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        ) : (
            <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
        )}
        <span className={cn("text-sm", isMet ? "text-foreground" : "text-muted-foreground")}>{text}</span>
    </div>
);

export default function WalletPage() {
  const [savedAddress, setSavedAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [balance, setBalance] = useState(0);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [alertDialog, setAlertDialog] = useState({ open: false, title: '', description: '' });

  const showDialog = (title: string, description: string) => {
    setAlertDialog({ open: true, title, description });
  };


  useEffect(() => {
    const init = () => {
        let currentUser: TelegramUser | null = null;
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
        } else {
           // Fallback if no context at all
           router.replace('/');
           return;
        }

        if (currentUser) {
            setUser(currentUser);
        } else {
            setIsLoading(false);
        }
    }
    init();
  }, [router]);

  const loadUserData = useCallback(async () => {
    if (user) {
        setIsLoading(true);
        try {
            const { userData: freshUserData } = await getUserData(user);

            setUserData(freshUserData);
            if (freshUserData.walletAddress) {
                setSavedAddress(freshUserData.walletAddress);
                setManualAddress(freshUserData.walletAddress);
            }
            setIsVerified(freshUserData.verificationStatus === 'verified');
            setBalance(freshUserData.balance);

        } catch (error) {
            console.error("Failed to load user wallet data:", error);
        } finally {
            setIsLoading(false);
        }
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
        if(document.visibilityState === 'visible') {
            loadUserData();
        }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [loadUserData]);


  const handleSaveAddress = async () => {
    setIsSaving(true);
    
    const trimmedAddress = manualAddress.trim();

    if (!isValidSolanaAddress(trimmedAddress)) {
        showDialog('Invalid Solana Address', 'Please enter a valid Solana wallet address.');
        setIsSaving(false);
        return;
    }


    if (trimmedAddress && user) {
        try {
            const existingUser = await findUserByWalletAddress(trimmedAddress);
            const currentUserId = getUserId(user);

            if (existingUser && existingUser.id !== currentUserId) {
                showDialog('Wallet Address In Use', 'This Solana wallet is already registered to another account.');
                setIsSaving(false);
                return;
            }

            await saveWalletAddress(user, trimmedAddress);

            setTimeout(() => {
                setSavedAddress(trimmedAddress);
                showDialog('Wallet Address Saved', 'Your wallet address has been saved successfully.');
                setIsSaving(false);
                setIsDialogOpen(false); 
            }, 1000);

        } catch (error) {
            console.error("Error saving wallet address:", error);
            showDialog('Error', 'Could not save wallet address.');
            setIsSaving(false);
        }
    } else {
        showDialog('Invalid Address', 'Please provide a wallet address.');
        setIsSaving(false);
    }
  };
  
  const handleTriggerClick = () => {
    if (!isValidSolanaAddress(manualAddress.trim())) {
        showDialog('Invalid Solana Address', 'Please enter a valid Solana wallet address.');
        return;
    }
    
    setIsDialogOpen(true);
  }

  const truncateAddress = (address: string) => {
    if (!address) return '';
    if (address.length < 14) return address;
    return `${address.slice(0, 6)}****${address.slice(-6)}`;
  }
  
  const renderWalletUI = () => {
    if (savedAddress) {
        return (
            <>
                <p className="text-sm text-muted-foreground mb-4">
                    Your Solana wallet address is saved and will be used for future airdrops.
                </p>
                <div className="flex items-center justify-center p-4 bg-primary/10 rounded-lg border border-primary/20 space-x-3">
                    <WalletIcon className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="font-mono text-lg font-bold text-foreground break-all">{truncateAddress(savedAddress)}</span>
                </div>
            </>
        );
    }

    return (
        <>
            <p className="text-sm text-muted-foreground mb-4">
                Enter your Solana wallet address to be eligible for future Exnus EXN airdrop snapshots.
            </p>

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
            </div>
        </>
    )
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
          ) : (
             <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Coins className="w-8 h-8 text-primary" />
                        Airdrop
                    </h1>
                </div>

                <Alert className="border-primary/20 bg-primary/5 text-center">
                    <Info className="h-4 w-4" />
                    <CardTitle className="text-primary text-base">Airdrop Coming Soon!</CardTitle>
                    <AlertBoxDescription>
                        The official Exnus EXN airdrop is scheduled for Q4 2025.
                    </AlertBoxDescription>
                </Alert>
                
                 <Card className="w-full bg-primary/5 border-primary/10">
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gold">{balance.toLocaleString()} EXN</span>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                 <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Exnus EXN Airdrop</h3>
                        {renderWalletUI()}
                    </div>
                 </div>

                 <Card className="bg-primary/5 border-primary/10">
                    <CardHeader>
                        <CardTitle className="text-base">Airdrop Eligibility</CardTitle>
                        <CardDescription className="text-xs">You must meet all criteria to be eligible for the airdrop.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <EligibilityItem text="Wallet address submitted" isMet={!!savedAddress} />
                        <EligibilityItem text="Account verified" isMet={isVerified} />
                        <EligibilityItem text="Active user status" isMet={userData?.status === 'active'} />
                        <EligibilityItem text="Earned at least 10,000 EXN" isMet={(userData?.balance || 0) >= 10000} />
                        <EligibilityItem text="Purchased Booster Pack 1" isMet={userData?.purchasedBoosts?.includes('boost_1') || false} />
                    </CardContent>
                </Card>

                <Alert variant="destructive" className="mt-12">
                    <AlertTriangle className="h-4 w-4" />
                    <CardTitle className="text-destructive text-base">Important Notice</CardTitle>
                    <AlertBoxDescription>
                    Your wallet address is permanently saved and cannot be changed. Please ensure it is correct.
                    </AlertBoxDescription>
                </Alert>
            </div>
          )}
        </main>
       </div>
      <Footer />
       <AlertDialog open={alertDialog.open} onOpenChange={(open) => setAlertDialog(prev => ({...prev, open}))}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {alertDialog.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setAlertDialog(prev => ({...prev, open: false}))}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );

    