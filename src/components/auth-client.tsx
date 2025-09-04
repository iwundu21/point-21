
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';

export default function AuthClient() {
    const router = useRouter();

    useEffect(() => {
        // This component is now a fallback. The primary logic has moved to page.tsx
        // to handle the Telegram-first approach. We redirect to the main app page,
        // which will then handle either initializing the user or showing the "Open in Telegram" message.
        router.replace('/');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mt-4" />
                    </div>
                     <CardTitle>Initializing</CardTitle>
                     <CardDescription>Loading your secure session...</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4 text-center">
                    <p className="text-xs text-muted-foreground">If you are not redirected, please open the app in Telegram.</p>
                     <a href="https://t.me/Exnuspoint_bot" className="flex items-center gap-2 text-primary hover:underline">
                        <Bot className="w-5 h-5"/>
                        Open in Telegram
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}
