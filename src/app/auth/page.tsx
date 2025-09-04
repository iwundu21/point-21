
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';


export default function AuthPage() {
    const router = useRouter();

    useEffect(() => {
        // This page is now a fallback. The main logic is in src/app/page.tsx
        // It checks for Telegram context. If not present, it shows a message.
        // If a deep link to another page brought the user here, we send them home to get processed.
        router.replace('/');
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full">
                <CardHeader className="text-center space-y-4">
                     <div className="flex justify-center">
                         <Loader2 className="w-12 h-12 text-primary animate-spin mt-4" />
                    </div>
                     <CardTitle>Loading Application</CardTitle>
                     <CardDescription>Redirecting you to the main page...</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4 h-[60px]">
                    <p className="text-sm text-muted-foreground text-center">If you are not redirected, please open this app inside Telegram.</p>
                     <a href="https://t.me/Exnuspoint_bot" className="flex items-center gap-2 text-primary hover:underline">
                        <Bot className="w-5 h-5"/>
                        Open in Telegram
                    </a>
                </CardContent>
            </Card>
        </div>
    );
}
