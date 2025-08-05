
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, Link, AlertTriangle } from 'lucide-react';
import { findUserByWalletAddress, UserData } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription as AlertBoxDescription } from '@/components/ui/alert';

export default function AuthPage() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('loading'); // loading, new_user, existing_user, wrong_wallet
    const [savedAddress, setSavedAddress] = useState<string | null>(null);

    const checkUserStatus = async (walletAddress: string) => {
        setIsLoading(true);
        const userData = await findUserByWalletAddress(walletAddress);
        if (userData && userData.walletAddress) {
            setSavedAddress(userData.walletAddress);
            // If the connected wallet is the saved one, let them in.
            if (walletAddress === userData.walletAddress) {
                sessionStorage.setItem('connected_wallet', walletAddress);
                const browserId = `wallet_${walletAddress}`;
                localStorage.setItem('browser_user_id', browserId);
                router.replace('/');
            } else {
                // This case happens if they somehow have a browser_id for a different wallet.
                // We force them to connect the correct one.
                setStatus('wrong_wallet');
            }
        } else {
            // No user data found for this wallet, so it's a new user.
            sessionStorage.setItem('connected_wallet', walletAddress);
            const browserId = `wallet_${walletAddress}`;
            localStorage.setItem('browser_user_id', browserId);
            router.replace('/wallet'); // Redirect to save the new wallet
        }
        setIsLoading(false);
    };
    
    useEffect(() => {
        // This effect runs when the wallet is connected.
        if (connected && publicKey) {
            const currentWallet = publicKey.toBase58();
            checkUserStatus(currentWallet);
        } else {
            // If not connected, set status to prompt connection.
            setStatus('prompt_connect');
        }
    }, [connected, publicKey, router]);
    
    const truncateAddress = (address: string) => {
        if (!address) return '';
        if (address.length < 10) return address;
        return `${address.slice(0, 5)}...${address.slice(-5)}`;
    }

    const getCardContent = () => {
        switch (status) {
            case 'loading':
                 return (
                    <>
                        <CardTitle>Authenticating</CardTitle>
                        <CardDescription>Please wait while we check your credentials...</CardDescription>
                        <Loader2 className="w-12 h-12 text-primary animate-spin mt-4" />
                    </>
                );
            case 'wrong_wallet':
                return (
                     <>
                        <AlertTriangle className="w-12 h-12 text-destructive" />
                        <CardTitle>Incorrect Wallet</CardTitle>
                        <CardDescription>
                            You connected an incorrect wallet. Please connect with your saved address: {truncateAddress(savedAddress || '')}.
                        </CardDescription>
                    </>
                )
             case 'prompt_connect':
             default:
                return (
                    <>
                        <ShieldCheck className="w-12 h-12 text-primary" />
                        <CardTitle>Connect Your Wallet</CardTitle>
                        <CardDescription>Connect your Solana wallet to access your Exnus Points dashboard.</CardDescription>
                    </>
                )
        }
    }


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }
    

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        {getCardContent()}
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                     <WalletMultiButton />
                      {status === 'wrong_wallet' && (
                         <Alert variant="destructive">
                            <AlertBoxDescription>
                                The connected wallet does not match the one associated with this account.
                            </AlertBoxDescription>
                        </Alert>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}

