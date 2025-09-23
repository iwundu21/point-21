
'use client';

import { useState, useEffect } from 'react';
import { TelegramUser } from '@/lib/user-utils';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Gift, Users, Star } from 'lucide-react';
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
    const [initialBalance, setInitialBalance] = useState(500); // Default starting bonus

    const handleNext = async () => {
        if (stage === 4) {
            setIsLoading(true);
            try {
                // The flow now just marks onboarding as complete and can grant a standard bonus
                const result = await completeOnboarding({ user });
                if(result.success) {
                    onComplete(result.initialBalance);
                } else {
                    console.error("Onboarding completion failed:", result.reason);
                    // Fallback for the user
                    onComplete(0);
                }
            } catch (error) {
                console.error("Error during onboarding completion:", error);
                 onComplete(0);
            } finally {
                setIsLoading(false);
            }
        } else {
            setStage(prev => prev + 1);
        }
    };
    
    const renderStage = () => {
        switch (stage) {
            case 1:
                return (
                    <div className="text-center animate-fade-in space-y-4">
                        <h1 className="text-4xl font-bold text-foreground">Welcome to the Exnus Family!</h1>
                        <p className="text-xl text-primary">{getGreeting()}, {user.first_name}!</p>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            We're thrilled to have you join our mission. Get ready to explore the ecosystem, earn EXN tokens, and be a part of the future of decentralized engagement.
                        </p>
                    </div>
                );
            case 2:
                return (
                     <div className="text-center animate-fade-in space-y-4">
                        <h1 className="text-4xl font-bold text-foreground">Your Head Start Bonus</h1>
                        <p className="text-xl text-muted-foreground">As a thank you for joining, we're starting you off with a reward.</p>
                        <div className="py-8">
                             <p className="text-6xl font-bold text-gold my-4 animate-heartbeat">{initialBalance.toLocaleString()} EXN</p>
                        </div>
                        <p className="text-sm text-muted-foreground">This bonus is just the beginning of your journey.</p>
                    </div>
                );
            case 3:
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">How It Works</h1>
                        <p className="text-xl text-muted-foreground">Earning EXN is simple and rewarding.</p>
                        <div className="text-left max-w-md mx-auto space-y-6 text-lg">
                            <div className="flex items-start gap-4">
                                <Zap className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Daily Mining</h3>
                                    <p className="text-muted-foreground text-base">Activate your mining session every 24 hours to earn EXN tokens automatically.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <Users className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Social Tasks</h3>
                                    <p className="text-muted-foreground text-base">Engage with our social media and complete tasks to earn bonus EXN.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <Gift className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Refer Friends</h3>
                                    <p className="text-muted-foreground text-base">Invite friends to join. You'll both earn extra EXN when they sign up with your code.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="text-center animate-fade-in space-y-4">
                        <h1 className="text-4xl font-bold text-foreground">Ready to Begin?</h1>
                        <p className="text-xl text-muted-foreground">Your journey into the Exnus ecosystem starts now.</p>
                        <div className="py-8">
                           <Star className="w-24 h-24 text-gold animate-fast-pulse" />
                        </div>
                        <p className="text-muted-foreground max-w-md mx-auto">
                           Click below to enter the app and start your first mining session!
                        </p>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-fade-in">
            <div className="flex-grow flex flex-col items-center justify-center w-full">
                {renderStage()}
            </div>
            <div className="w-full max-w-sm pb-8">
                <Button onClick={handleNext} disabled={isLoading} className="w-full h-12 text-lg">
                    {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (stage === 4 ? 'Enter App' : 'Continue')}
                </Button>
            </div>
        </div>
    );
};

export default Onboarding;
