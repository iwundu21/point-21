
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, Link, AlertTriangle } from 'lucide-react';
import { getWalletAddress, findUserByWalletAddress, UserData } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription as AlertBoxDescription } from '@/components/ui/alert';

export default function AuthPage() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('loading'); // loading, new_user, existing_user, wrong_wallet
    const [savedAddress, setSavedAddress] = useState<string | null>(null);

    const browserId = useMemo(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('browser_user_id');
        }
        return null;
    }, []);

    useEffect(() => {
        const checkUserStatus = async () => {
            if (!browserId) {
                setStatus('new_user');
                setIsLoading(false);
                return;
            }

            const userData = await findUserByWalletAddress(browserId.replace('wallet_', ''));
            if (userData && userData.walletAddress) {
                setSavedAddress(userData.walletAddress);
                setStatus('existing_user');
            } else {
                setStatus('new_user');
            }
            setIsLoading(false);
        };
        checkUserStatus();
    }, [browserId]);


    useEffect(() => {
        if (connected && publicKey) {
            const currentWallet = publicKey.toBase58();
            if (status === 'existing_user' && savedAddress) {
                if (currentWallet === savedAddress) {
                    sessionStorage.setItem('connected_wallet', currentWallet);
                    router.replace('/');
                } else {
                    setStatus('wrong_wallet');
                }
            } else if (status === 'new_user') {
                sessionStorage.setItem('connected_wallet', currentWallet);
                const newBrowserId = `wallet_${currentWallet}`;
                localStorage.setItem('browser_user_id', newBrowserId);
                router.replace('/wallet'); // Redirect to save the wallet
            }
        }
    }, [connected, publicKey, status, savedAddress, router]);
    
    const truncateAddress = (address: string) => {
        if (!address) return '';
        if (address.length < 10) return address;
        return `${address.slice(0, 5)}...${address.slice(-5)}`;
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
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        {status === 'wrong_wallet' ? <AlertTriangle className="w-12 h-12 text-destructive" /> : <ShieldCheck className="w-12 h-12 text-primary" />}
                    </div>
                    <CardTitle>
                        {status === 'existing_user' && 'Welcome Back'}
                        {status === 'new_user' && 'Connect Your Wallet'}
                        {status === 'wrong_wallet' && 'Incorrect Wallet'}
                    </CardTitle>
                    <CardDescription>
                         {status === 'existing_user' && `Please connect your saved wallet (${truncateAddress(savedAddress || '')}) to continue.`}
                         {status === 'new_user' && 'Connect your Solana wallet to create an account and access your dashboard.'}
                         {status === 'wrong_wallet' && `You connected an incorrect wallet. Please connect your saved wallet: ${truncateAddress(savedAddress || '')}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                     <WalletMultiButton />
                      {status === 'wrong_wallet' && (
                         <Alert variant="destructive">
                            <AlertBoxDescription>
                                The connected wallet does not match the one associated with your account.
                            </AlertBoxDescription>
                        </Alert>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}

