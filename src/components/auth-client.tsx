
'use client';

import '@solana/wallet-adapter-react-ui/styles.css';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { findUserByWalletAddress } from '@/lib/database';
import { Alert, AlertDescription as AlertBoxDescription } from '@/components/ui/alert';

export default function AuthClient() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkUserStatus = async () => {
            if (connected && publicKey) {
                setIsChecking(true);
                setError(null);
                
                const walletAddress = publicKey.toBase58();

                try {
                    // This is the primary key for browser users now.
                    sessionStorage.setItem('connected_wallet', walletAddress);
                    const browserId = `wallet_${walletAddress}`;
                    localStorage.setItem('browser_user_id', browserId);
                    
                    const userData = await findUserByWalletAddress(walletAddress);

                    if (userData && userData.walletAddress) {
                        // User exists and has saved their wallet, go to dashboard
                        router.replace('/');
                    } else {
                        // This is a new user or a user who hasn't saved their wallet yet.
                        // Send them to the wallet page to complete setup.
                        router.replace('/wallet');
                    }
                } catch (e) {
                    console.error("Error checking user status", e);
                    setError("An error occurred while checking your account. Please try again.");
                    setIsChecking(false);
                }
            }
        };

        checkUserStatus();
    }, [connected, publicKey, router]);
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        {isChecking ? (
                            <Loader2 className="w-12 h-12 text-primary animate-spin mt-4" />
                        ) : (
                             <ShieldCheck className="w-12 h-12 text-primary" />
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
