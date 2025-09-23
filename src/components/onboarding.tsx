
'use client';

import { useState, useEffect } from 'react';
import { TelegramUser } from '@/lib/user-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { completeOnboarding } from '@/ai/flows/onboarding-flow';

interface OnboardingProps {
    user: TelegramUser;
    onComplete: (initialBalance: number) => void;
}

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

const Onboarding = ({ user, onComplete }: OnboardingProps) => {
    const [stage, setStage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [accountAge, setAccountAge] = useState({ years: 0, months: 0, days: 0 });
    const [creationDate, setCreationDate] = useState('');
    const [initialBalance, setInitialBalance] = useState(0);

    const handleNext = async () => {
        if (stage === 4) {
            setIsLoading(true);
            try {
                const result = await completeOnboarding({ user });
                if(result.success) {
                    onComplete(result.initialBalance);
                } else {
                    // Handle error case, maybe show a message
                    console.error("Onboarding completion failed:", result.reason);
                }
            } catch (error) {
                console.error("Error during onboarding completion:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setStage(prev => prev + 1);
        }
    };
    
     useEffect(() => {
        if (stage === 2 && user.id && typeof user.id === 'number') {
            // Telegram IDs are unix timestamps of account creation.
            const creationTimestamp = user.id;
            const creation = new Date(creationTimestamp * 1000);
            setCreationDate(creation.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));

            const now = new Date();
            let years = now.getFullYear() - creation.getFullYear();
            let months = now.getMonth() - creation.getMonth();
            let days = now.getDate() - creation.getDate();

            if (days < 0) {
                months -= 1;
                days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
            }
            if (months < 0) {
                years -= 1;
                months += 12;
            }
            setAccountAge({ years, months, days });
        }
         if (stage === 3 && user.id && typeof user.id === 'number') {
            const creationTimestamp = user.id;
            const creation = new Date(creationTimestamp * 1000);
            const now = new Date();
            const ageInMs = now.getTime() - creation.getTime();
            const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
            setInitialBalance(ageInDays);
        }

    }, [stage, user.id]);


    const renderStage = () => {
        switch (stage) {
            case 1:
                return (
                    <>
                        <CardTitle>Welcome to the Exnus Family!</CardTitle>
                        <CardDescription>{getGreeting()}, {user.first_name}!</CardDescription>
                        <CardContent className="pt-6">
                            <p className="text-muted-foreground">
                                We're thrilled to have you join our mission. Get ready to explore the ecosystem, earn EXN tokens, and be a part of the future.
                            </p>
                        </CardContent>
                    </>
                );
            case 2:
                return (
                     <>
                        <CardTitle>Your Telegram Legacy</CardTitle>
                        <CardDescription>We value our long-standing community members.</CardDescription>
                        <CardContent className="pt-6 text-center space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Your account was created on:</p>
                                <p className="text-xl font-bold text-primary">{creationDate}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">Your account is:</p>
                                <p className="text-xl font-bold text-primary">
                                    {accountAge.years > 0 && `${accountAge.years}y `} 
                                    {accountAge.months > 0 && `${accountAge.months}m `}
                                    {`${accountAge.days}d old`}
                                </p>
                            </div>
                        </CardContent>
                    </>
                );
            case 3:
                return (
                    <>
                        <CardTitle>Your Head Start Bonus</CardTitle>
                        <CardDescription>As a thank you, we're rewarding your loyalty.</CardDescription>
                         <CardContent className="pt-6 text-center">
                            <p className="text-sm text-muted-foreground">Based on your account age, you've been awarded:</p>
                            <p className="text-4xl font-bold text-gold my-4">{initialBalance.toLocaleString()} EXN</p>
                            <p className="text-xs text-muted-foreground">(1 EXN per day since you joined Telegram)</p>
                        </CardContent>
                    </>
                );
            case 4:
                return (
                    <>
                        <CardTitle>How It Works</CardTitle>
                        <CardDescription>Earning EXN is simple.</CardDescription>
                         <CardContent className="pt-6 text-left text-sm text-muted-foreground space-y-4">
                            <p>1. <b className="text-foreground">Daily Mining:</b> Activate your mining session every 24 hours to earn EXN tokens automatically.</p>
                            <p>2. <b className="text-foreground">Complete Tasks:</b> Engage with our social media and complete tasks to earn bonus EXN.</p>
                            <p>3. <b className="text-foreground">Refer Friends:</b> Invite friends to join Exnus. You'll both earn extra EXN when they sign up with your code.</p>
                            <p>4. <b className="text-foreground">Stay Active:</b> Log in daily to build your streak and climb the leaderboard for more rewards.</p>
                        </CardContent>
                    </>
                );
            default:
                return null;
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="max-w-sm w-full text-center">
                <CardHeader>
                    {renderStage()}
                </CardHeader>
                <CardContent>
                    <Button onClick={handleNext} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (stage === 4 ? 'Enter App' : 'Continue')}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default Onboarding;
