
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link, Wallet } from 'lucide-react';
import { mergeAccounts } from '@/ai/flows/merge-accounts-flow';
import { saveUserData } from '@/lib/database';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface User {
    id: number | string;
    first_name: string;
}

const isValidSolanaAddress = (address: string): boolean => {
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
};

export default function MergeAccountPage() {
    const [walletAddress, setWalletAddress] = useState('');
    const [isMerging, setIsMerging] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp?.initDataUnsafe?.user) {
            setUser(window.Telegram.WebApp.initDataUnsafe.user);
        } else {
            // Redirect if not in Telegram or user data is not available
            router.replace('/');
        }
    }, [router]);
    
    const handleMerge = async () => {
        if (!user || !isValidSolanaAddress(walletAddress)) {
            toast({
                variant: 'destructive',
                title: 'Invalid Address',
                description: 'Please enter a valid Solana wallet address.'
            });
            return;
        }

        setIsMerging(true);
        try {
            const result = await mergeAccounts({
                telegramUser: user as any,
                browserWalletAddress: walletAddress
            });

            if (result.success) {
                toast({
                    title: 'Account Merged!',
                    description: `Your balance of ${result.mergedBalance?.toLocaleString()} points has been transferred.`
                });
                router.replace('/');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Merge Failed',
                    description: result.reason || 'Could not find a browser account with that wallet address.'
                });
            }
        } catch (error) {
            console.error("Merge error:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'An unexpected error occurred. Please try again.'
            });
        } finally {
            setIsMerging(false);
        }
    };
    
    const handleSkip = async () => {
        if (!user) return;
        // Mark the user as having skipped/completed the merge process so they aren't asked again
        await saveUserData(user, { hasMergedBrowserAccount: true });
        router.replace('/');
    };

    if (!user) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-2">
                    <div className="flex justify-center">
                        <Link className="w-12 h-12 text-primary" />
                    </div>
                    <CardTitle>Link Your Browser Account</CardTitle>
                    <CardDescription>
                        Did you use our app in a browser before? Enter your Solana wallet address to transfer your points.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="Enter your Solana wallet address"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            disabled={isMerging}
                        />
                    </div>
                    <Button onClick={handleMerge} disabled={isMerging || !walletAddress.trim()} className="w-full">
                        {isMerging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                        {isMerging ? 'Merging...' : 'Merge Account'}
                    </Button>
                    <Button variant="link" onClick={handleSkip} className="w-full">
                        Skip / I'm a new user
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
