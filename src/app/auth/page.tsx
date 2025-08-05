'use client';

import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Loader2 } from 'lucide-react';

const AuthClient = dynamic(() => import('@/components/auth-client'), {
    ssr: false,
    loading: () => (
         <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-4">
                     <div className="flex justify-center">
                         <Loader2 className="w-12 h-12 text-primary animate-spin mt-4" />
                    </div>
                     <CardTitle>Loading Wallet</CardTitle>
                     <CardDescription>Preparing secure connection...</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4 h-[60px]">
                </CardContent>
            </Card>
        </div>
    )
})

export default function AuthPage() {
    return <AuthClient />;
}
