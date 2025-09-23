
'use client';

import { useState, useEffect } from 'react';
import { TelegramUser } from '@/lib/user-utils';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Gift, Users, Star, CalendarDays, Award, UserCheck } from 'lucide-react';
import { completeOnboarding } from '@/ai/flows/onboarding-flow';

interface OnboardingProps {
    user: TelegramUser;
    isNewUser: boolean;
    onComplete: (initialBalance: number) => void;
}

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

const Onboarding = ({ user, isNewUser, onComplete }: OnboardingProps) => {
    const [stage, setStage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [bonusResult, setBonusResult] = useState<{
        creationDate: string;
        bonus: number;
    } | null>(null);

    const finalStage = isNewUser ? 5 : 4;

    const handleNext = async () => {
        if (stage === 1) {
             setIsLoading(true);
             try {
                const result = await completeOnboarding({ user });
                if(result.success) {
                    setBonusResult({
                        creationDate: result.accountCreationDate,
                        bonus: result.initialBalance
                    });
                     setStage(2);
                } else {
                    // Fallback if the flow fails
                    showErrorAndExit();
                }
             } catch (e) {
                 console.error("Onboarding calculation failed:", e);
                 showErrorAndExit();
             } finally {
                setIsLoading(false);
             }
        } else if (stage === finalStage) {
            // Final stage, complete the onboarding
             if (bonusResult) {
                onComplete(bonusResult.bonus);
            } else {
                 // Should not happen, but as a fallback
                onComplete(0);
            }
        } else {
            setStage(prev => prev + 1);
        }
    };
    
    const showErrorAndExit = () => {
         // In a real app, you'd show a proper error message
         // For now, we'll just exit the onboarding.
        onComplete(0);
    }

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
                        <h1 className="text-4xl font-bold text-foreground">Your Telegram Journey</h1>
                        <p className="text-xl text-muted-foreground">We've checked your Telegram history to prepare your welcome gift.</p>
                         <div className="py-8 flex flex-col items-center justify-center gap-4">
                            <CalendarDays className="w-20 h-20 text-primary" />
                            <p className="text-base text-muted-foreground">Account Created:</p>
                            <p className="text-3xl font-bold text-foreground animate-heartbeat">{bonusResult?.creationDate}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Your loyalty as a long-time Telegram user is valuable to us.</p>
                    </div>
                );
            case 3:
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">Your Loyalty Bonus</h1>
                        <p className="text-xl text-muted-foreground">Based on your account age, here's your head start.</p>
                        <div className="py-8 flex flex-col items-center justify-center gap-4">
                            <Award className="w-20 h-20 text-gold" />
                            <p className="text-6xl font-bold text-gold my-4 animate-fast-pulse">{bonusResult?.bonus.toLocaleString()} EXN</p>
                        </div>
                        <p className="text-sm text-muted-foreground">This bonus reflects your time in the Telegram ecosystem. The older your account, the bigger the reward.</p>
                    </div>
                );
            case 4:
                 return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">How It Works</h1>
                        <p className="text-xl text-muted-foreground">Earning more EXN is simple and rewarding.</p>
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
            case 5:
                 return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">One Last Thing...</h1>
                        <p className="text-xl text-muted-foreground">Complete your Welcome Tasks to unlock mining!</p>
                        <div className="text-left max-w-md mx-auto space-y-6 text-lg">
                            <div className="flex items-start gap-4">
                                <UserCheck className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Welcome Tasks</h3>
                                    <p className="text-muted-foreground text-base">Complete a few simple social tasks to get another bonus and unlock all app features, including daily mining.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <Award className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Achievements</h3>
                                    <p className="text-muted-foreground text-base">Unlock achievements by using the app to earn even more EXN.</p>
                                </div>
                            </div>
                        </div>
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
                    {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : (stage === finalStage ? 'Enter App' : 'Continue')}
                </Button>
            </div>
        </div>
    );
};

export default Onboarding;
