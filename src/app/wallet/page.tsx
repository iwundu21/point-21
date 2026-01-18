
'use client';

import '@solana/wallet-adapter-react-ui/styles.css';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet as WalletIcon, Save, AlertTriangle, Coins, Loader2, Bot, Info, CheckCircle, XCircle, UserCheck, Star, Zap, Gift, Handshake, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription as AlertBoxDescription, AlertTitle as AlertBoxTitle } from '@/components/ui/alert';
import { getUserData, saveWalletAddress, findUserByWalletAddress, UserData, getUserId, getAllocationCheckStatus, getAirdropStatus, getAirdropCommitDeadline } from '@/lib/database';
import { calculateAllocation } from '@/ai/flows/calculate-allocation-flow';
import { commitAirdrop } from '@/ai/flows/commit-airdrop-flow';
import { Separator } from '@/components/ui/separator';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';
import { TelegramUser } from '@/lib/user-utils';
import LoadingDots from '@/components/loading-dots';


const isValidSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};

const EligibilitySquare = ({ title, isMet, icon }: { title: string; isMet: boolean; icon: React.ReactNode }) => (
    <div className={cn(
        "relative w-full aspect-square rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all duration-300",
        isMet 
            ? 'bg-green-500/10 border-2 border-green-500/30 text-foreground' 
            : 'bg-primary/5 border border-primary/10 text-muted-foreground'
    )}>
        <div className="absolute top-2 right-2">
            {isMet ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-destructive/50" />}
        </div>
        <div className="mb-1">{icon}</div>
        <p className="text-xs font-semibold leading-tight">{title}</p>
    </div>
);


export default function WalletPage() {
  const [savedAddress, setSavedAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [balance, setBalance] = useState(0);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAllocationCheckEnabled, setIsAllocationCheckEnabled] = useState(false);
  const [isAirdropEnded, setIsAirdropEnded] = useState(false);
  const [airdropDeadline, setAirdropDeadline] = useState<Date | null>(null);
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [allocationDialogContent, setAllocationDialogContent] = useState<'show_allocation' | 'enter_wallet' | 'committing' | 'committed' | 'error'>('show_allocation');
  const [allocationAmount, setAllocationAmount] = useState(0);
  const [commitWalletInput, setCommitWalletInput] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

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
            const [{ userData: freshUserData, isAirdropEnded: airdropStatus }, { isEnabled: allocationCheckIsEnabled }, deadlineData] = await Promise.all([
                getUserData(user),
                getAllocationCheckStatus(),
                getAirdropCommitDeadline()
            ]);

            setUserData(freshUserData);
            if (freshUserData.walletAddress) {
                setSavedAddress(freshUserData.walletAddress);
                setManualAddress(freshUserData.walletAddress);
            }
            setBalance(freshUserData.balance);
            setIsAllocationCheckEnabled(allocationCheckIsEnabled);
            setIsAirdropEnded(airdropStatus);
            
            if (deadlineData.deadline) {
                const deadline = new Date(deadlineData.deadline);
                setAirdropDeadline(deadline);
                setDeadlinePassed(new Date() > deadline);
            } else {
                setAirdropDeadline(null);
                setDeadlinePassed(false);
            }

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
    if (isAirdropEnded) {
        setCommitMessage('The wallet submission period has ended.');
        setAllocationDialogContent('error');
        return;
    }
    
    setIsSaving(true);
    
    const trimmedAddress = manualAddress.trim();

    if (!isValidSolanaAddress(trimmedAddress)) {
        setCommitMessage('Please enter a valid Solana wallet address.');
        setAllocationDialogContent('error');
        setIsSaving(false);
        return;
    }

    if (trimmedAddress && user) {
        try {
            const existingUser = await findUserByWalletAddress(trimmedAddress);
            const currentUserId = getUserId(user);

            if (existingUser && existingUser.id !== currentUserId) {
                setCommitMessage('This Solana wallet is already registered to another account.');
                setAllocationDialogContent('error');
                setIsSaving(false);
                return;
            }

            await saveWalletAddress(user, trimmedAddress);

            setTimeout(() => {
                setSavedAddress(trimmedAddress);
                 setCommitMessage('Your wallet address has been saved successfully.');
                setAllocationDialogContent('committed');
                setIsSaving(false);
            }, 1000);

        } catch (error) {
            console.error("Error saving wallet address:", error);
            setCommitMessage('Could not save wallet address.');
            setAllocationDialogContent('error');
            setIsSaving(false);
        }
    } else {
        setCommitMessage('Please provide a wallet address.');
        setAllocationDialogContent('error');
        setIsSaving(false);
    }
  };

  const handleCheckAllocation = async () => {
    if (!user) return;

    if (!savedAddress) {
        setCommitMessage('Sorry, you are not eligible for the EXN airdrop allocation because a wallet address has not been submitted.');
        setAllocationDialogContent('error');
        setIsAllocationDialogOpen(true);
        return;
    }
    
    if (userData?.airdropCommitted) {
         setCommitMessage('You have already committed your airdrop allocation.');
         setAllocationDialogContent('committed');
         setIsAllocationDialogOpen(true);
         return;
    }
    
    if (deadlinePassed) {
        setCommitMessage('The airdrop commitment deadline has passed.');
        setAllocationDialogContent('error');
        setIsAllocationDialogOpen(true);
        return;
    }

    setAllocationDialogContent('committing');
    setCommitMessage('Calculating your allocation...');
    setIsAllocationDialogOpen(true);

    try {
        const result = await calculateAllocation({ userId: getUserId(user) });
        if (result.success && result.allocation !== undefined) {
            setAllocationAmount(result.allocation);
            setAllocationDialogContent('show_allocation');
        } else {
             setCommitMessage(result.reason || 'Could not calculate your allocation at this time.');
             setAllocationDialogContent('error');
        }
    } catch (error) {
        console.error("Allocation check failed:", error);
        setCommitMessage('An unexpected error occurred during calculation.');
        setAllocationDialogContent('error');
    }
  };

  const handleCommit = async () => {
    if (!user || !commitWalletInput.trim()) {
        setCommitMessage('Please enter your wallet address to verify.');
        setAllocationDialogContent('error');
        return;
    }

    setAllocationDialogContent('committing');
    setCommitMessage('Committing in progress...');

    setTimeout(async () => {
        try {
            const result = await commitAirdrop({ userId: getUserId(user), walletAddressToVerify: commitWalletInput });
            if (result.success) {
                setCommitMessage('Success! Your airdrop commitment has been confirmed.');
                setAllocationDialogContent('committed');
                // Refresh user data to reflect committed status
                await loadUserData();
            } else {
                setCommitMessage(result.reason || 'An unknown error occurred during commit.');
                setAllocationDialogContent('error');
            }
        } catch (error) {
             console.error("Airdrop commit failed:", error);
             setCommitMessage('An unexpected server error occurred.');
             setAllocationDialogContent('error');
        }
    }, 20000); // 20-second delay
  };
  
  
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
    
    if (isAirdropEnded) {
        return (
            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                The wallet submission period has ended.
            </div>
        );
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
            <Button className="w-full">
                <Save className="mr-2 h-4 w-4" /> Save Address
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive" /> Are you absolutely sure?
                </DialogTitle>
                <DialogDescription>
                This action cannot be undone. Please double-check your wallet address before saving. An incorrect address may result in permanent loss of airdrops.
                </DialogDescription>
            </DialogHeader>
             <div className="flex flex-col space-y-4 items-center">
                <Input 
                    placeholder="Paste your Solana wallet address"
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    className="text-center"
                />
            </div>
            <DialogFooter>
                <Button onClick={handleSaveAddress} disabled={isSaving || !manualAddress.trim()} variant="destructive">
                    {isSaving ? <LoadingDots text="Saving" /> : 'Confirm & Save'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    )
  }

  const renderAllocationDialogContent = () => {
    switch (allocationDialogContent) {
      case 'show_allocation':
        const tgeAmount = allocationAmount * 0.5;
        const vestingAmount = allocationAmount * 0.5;
        const monthlyVestAmount = vestingAmount / 8;
        return (
          <>
            <DialogHeader>
              <DialogTitle>Your Airdrop Allocation</DialogTitle>
              <DialogDescription>
                Based on your current points, your total airdrop allocation is <span className="font-bold text-green-500">{allocationAmount.toFixed(8)} EXN</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="my-4 space-y-4 text-sm">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Initial Claim at TGE (50%)</span>
                        <span className="font-bold text-green-500">{tgeAmount.toFixed(8)} EXN</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">This amount will be available to claim immediately at the Token Generation Event.</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Vesting Amount (50%)</span>
                        <span className="font-bold text-muted-foreground">{vestingAmount.toFixed(8)} EXN</span>
                    </div>
                     <p className="text-xs text-muted-foreground mt-1">This amount will be released linearly over a period of 8 months after TGE.</p>
                    <div className="mt-2 pt-2 border-t border-primary/10 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Monthly Claimable:</span>
                        <span className="text-xs font-bold text-muted-foreground">{monthlyVestAmount.toFixed(8)} EXN</span>
                    </div>
                </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setAllocationDialogContent('enter_wallet')}>Commit Your Airdrop</Button>
            </DialogFooter>
          </>
        );
      case 'enter_wallet':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Verify Wallet to Commit</DialogTitle>
              <DialogDescription>
                To finalize your commitment, please re-enter your saved wallet address below. This is a final, one-time action.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Input 
                    placeholder="Enter your saved Solana address"
                    value={commitWalletInput}
                    onChange={(e) => setCommitWalletInput(e.target.value)}
                />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAllocationDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCommit} disabled={!commitWalletInput.trim()}>
                Commit
              </Button>
            </DialogFooter>
          </>
        );
      case 'committing':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Processing Commitment</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground animate-pulse">{commitMessage}</p>
            </div>
          </>
        );
      case 'committed':
      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle className={cn(allocationDialogContent === 'error' && 'text-destructive')}>
                {allocationDialogContent === 'committed' ? 'Commitment Successful' : 'An Error Occurred'}
              </DialogTitle>
              <DialogDescription>
                {commitMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setIsAllocationDialogOpen(false)}>OK</Button>
            </DialogFooter>
          </>
        );
      default:
        return null;
    }
  }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <LoadingDots text="Loading Wallet Data"/>
            </div>
          ) : (
             <div className="w-full max-w-sm mx-auto space-y-6">
                
                <Card className="w-full bg-primary/5 border-primary/10">
                    <CardHeader className="p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gold">{balance.toLocaleString()} Points</span>
                        </div>
                    </CardContent>
                </Card>

                <Separator />

                 <div className="space-y-6">
                    <div>
                        <Alert className="border-blue-500/20 bg-blue-500/10 text-center mb-4">
                            <Info className="h-4 w-4 text-blue-400" />
                            <AlertBoxTitle className="text-blue-400 text-base">Eligibility Clarification</AlertBoxTitle>
                            <AlertBoxDescription className="text-blue-400/80">
                                All users with earned Points and a submitted wallet address are eligible for the airdrop, regardless of ecosystem contribution.
                            </AlertBoxDescription>
                        </Alert>
                        {renderWalletUI()}
                    </div>
                 </div>

                 <Card className="bg-primary/5 border-primary/10">
                    <CardHeader>
                        <CardTitle className="text-base">Airdrop Eligibility</CardTitle>
                        <CardDescription className="text-xs">Complete the following to secure your airdrop.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <div className="grid grid-cols-3 gap-3">
                            <EligibilitySquare title="Wallet Submitted" isMet={!!savedAddress} icon={<WalletIcon className="w-8 h-8" />} />
                            <EligibilitySquare title="Welcome Tasks" isMet={Object.values(userData?.welcomeTasks || {}).every(Boolean)} icon={<Gift className="w-8 h-8" />} />
                            <EligibilitySquare title="Referral Applied" isMet={userData?.referralBonusApplied || false} icon={<Handshake className="w-8 h-8" />} />
                       </div>
                       <p className="text-xs text-muted-foreground mt-3 text-center">
                         Completing Welcome Tasks and applying a referral code unlocks daily mining. Ensure all eligibility criteria are met for the airdrop.
                       </p>
                    </CardContent>
                </Card>
                
                <Separator />
                
                <Card className="w-full bg-primary/5 border-primary/10">
                    <CardHeader className="p-4">
                        <CardTitle>Allocation Check</CardTitle>
                        <CardDescription>
                            {isAllocationCheckEnabled
                                ? "Checker is live! Please check your allocation and commit."
                                : "Coming soon"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        {isAllocationCheckEnabled ? (
                            <Button onClick={handleCheckAllocation} disabled={isAllocationDialogOpen} className="w-full">
                                 {userData?.airdropCommitted ? 'View Commitment' : 'Check Allocation & Commit'}
                            </Button>
                        ) : (
                            <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                                Coming soon
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Alert variant="destructive" className="mt-12">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertBoxTitle className="text-destructive text-base">Important Notice</AlertBoxTitle>
                    <AlertBoxDescription>
                    Your wallet address is permanently saved and cannot be changed. Please ensure it is correct.
                    </AlertBoxDescription>
                </Alert>
            </div>
          )}
        </main>
       </div>
      <Footer />
       <Dialog open={isAllocationDialogOpen} onOpenChange={setIsAllocationDialogOpen}>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
                {renderAllocationDialogContent()}
            </DialogContent>
        </Dialog>
    </div>
  );
}

    