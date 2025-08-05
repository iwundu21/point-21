
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { findUserByWalletAddress } from '@/lib/database';
import { Alert, AlertDescription as AlertBoxDescription } from '@/components/ui/alert';

export default function AuthPage() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkUserStatus = async () => {
            if (connected && publicKey) {
                const walletAddress = publicKey.toBase58();
                setIsLoading(true);
                setError(null);
                
                try {
                    const userData = await findUserByWalletAddress(walletAddress);
                    sessionStorage.setItem('connected_wallet', walletAddress);
                    const browserId = `wallet_${walletAddress}`;
                    localStorage.setItem('browser_user_id', browserId);

                    if (userData && userData.walletAddress) {
                        // Existing user, redirect to dashboard
                        router.replace('/');
                    } else {
                        // New user, redirect to save wallet
                        router.replace('/wallet');
                    }
                } catch (e) {
                    console.error("Error checking user status", e);
                    setError("An error occurred while checking your account. Please try again.");
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        checkUserStatus();
    }, [connected, publicKey, router]);
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        {isLoading ? (
                            <>
                                <Loader2 className="w-12 h-12 text-primary animate-spin mt-4" />
                            </>
                        ) : (
                             <>
                                <ShieldCheck className="w-12 h-12 text-primary" />
                            </>
                        )}
                    </div>
                     <CardTitle>Connect Your Wallet</CardTitle>
                     <CardDescription>Connect your Solana wallet to access your Exnus Points dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                     <WalletMultiButton />
                      {error && (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertBoxDescription>
                                {error}
                            </AlertBoxDescription>
                        </Alert>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}
