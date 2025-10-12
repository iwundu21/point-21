
'use client';

import { useState, useEffect, useMemo } from 'react';
import { TelegramUser, getInitials } from '@/lib/user-utils';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Gift, Users, Star, CalendarDays, Award, UserCheck, RefreshCw } from 'lucide-react';
import { completeOnboarding } from '@/ai/flows/onboarding-flow';
import { UserData, saveUserData, getUserData, LEGACY_BOOST_REWARDS, claimLegacyBoostRewards, convertEPointsToExn } from '@/lib/database';
import { cn } from '@/lib/utils';
import LoadingDots from './loading-dots';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface OnboardingProps {
    user: TelegramUser;
    isNewUser: boolean;
    onComplete: () => void;
    initialData: UserData;
}

enum OnboardingStage {
    AccountConversion,
    LegacyBoosterReward,
    Welcome,
    HowItWorks,
    WelcomeTasks,
}


const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

const Onboarding = ({ user, isNewUser, onComplete, initialData }: OnboardingProps) => {
    const [stage, setStage] = useState<OnboardingStage | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [initialBalance, setInitialBalance] = useState(0);


    // Data for legacy booster reward stage
    const legacyBoosts = useMemo(() => {
        return (initialData.purchasedBoosts || [])
            .filter(boostId => LEGACY_BOOST_REWARDS.hasOwnProperty(boostId));
    }, [initialData.purchasedBoosts]);

    const totalLegacyReward = useMemo(() => {
        return legacyBoosts.reduce((total, boostId) => total + LEGACY_BOOST_REWARDS[boostId], 0);
    }, [legacyBoosts]);


    useEffect(() => {
        if (!initialData.hasConvertedToExn && !isNewUser) {
            setStage(OnboardingStage.AccountConversion);
        } else if (!initialData.claimedLegacyBoosts) {
            setStage(OnboardingStage.LegacyBoosterReward);
        } else if (!initialData.hasOnboarded) {
            setStage(OnboardingStage.Welcome);
        } else {
            // User is fully onboarded and converted, so just complete.
            onComplete();
        }
    }, [isNewUser, initialData, onComplete]);

    const handleNext = async () => {
        setIsLoading(true);

        try {
            switch (stage) {
                 case OnboardingStage.AccountConversion:
                    await convertEPointsToExn(user);
                    setStage(OnboardingStage.LegacyBoosterReward);
                    break;

                case OnboardingStage.LegacyBoosterReward:
                    await claimLegacyBoostRewards(user, totalLegacyReward);
                    setStage(OnboardingStage.Welcome);
                    break;

                case OnboardingStage.Welcome:
                    const result = await completeOnboarding({ user });
                    if (result.success) {
                        setInitialBalance(result.initialBalance);
                        setStage(OnboardingStage.HowItWorks);
                    } else {
                        showErrorAndExit();
                    }
                    break;
                
                case OnboardingStage.HowItWorks:
                    if (isNewUser) {
                        setStage(OnboardingStage.WelcomeTasks);
                    } else {
                        onComplete();
                    }
                    break;
                
                case OnboardingStage.WelcomeTasks:
                    onComplete();
                    break;
            }
        } catch (e) {
            console.error("Onboarding action failed:", e);
            showErrorAndExit();
        } finally {
            setIsLoading(false);
        }
    };
    
    const showErrorAndExit = () => {
        onComplete();
    }
    
    const renderStageContent = () => {
        switch (stage) {
            case OnboardingStage.AccountConversion:
                 const oldBalance = initialData.ePointsBalance || initialData.balance;
                 const newExnBalance = Math.floor((oldBalance / 1000) * 150);
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">Early Supporter Snapshot</h1>
                        <p className="text-xl text-muted-foreground">Thank you for being with us from the start!</p>
                         <div className="py-8 flex flex-col items-center justify-center gap-4 w-full max-w-sm">
                            <RefreshCw className="w-16 h-16 text-primary" />
                            <p className="text-base text-muted-foreground">As part of our system upgrade, we are converting your legacy E-Points to our new official currency, EXN, based on a snapshot of your account.</p>
                            
                            <div className="w-full space-y-2 my-4 p-4 border border-primary/20 rounded-lg">
                                <div className="flex justify-between items-center text-lg">
                                    <span>Old E-Points Balance:</span>
                                    <span className="font-bold text-muted-foreground">
                                        {oldBalance.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-lg">
                                    <span>Conversion Ratio:</span>
                                    <span className="font-bold text-muted-foreground">
                                        1000 : 150
                                    </span>
                                </div>
                                <div className="!mt-4 pt-2 border-t border-primary/20 flex justify-between items-center text-2xl font-bold">
                                    <span>New EXN Balance:</span>
                                    <span className="text-gold">{newExnBalance.toLocaleString()} EXN</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">This is a one-time conversion. Click below to confirm.</p>
                    </div>
                );
            case OnboardingStage.LegacyBoosterReward:
                 return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">A Gift For Your Support!</h1>
                        <p className="text-xl text-muted-foreground">Thank you for being an early supporter.</p>
                         <div className="py-8 flex flex-col items-center justify-center gap-4 w-full max-w-sm">
                            <Star className="w-16 h-16 text-gold" />
                            <p className="text-base text-muted-foreground">For your previous Booster Pack purchases, we're giving you a special EXN reward.</p>
                            
                            <div className="w-full space-y-2 my-4 p-4 border border-primary/20 rounded-lg">
                                {Object.keys(LEGACY_BOOST_REWARDS).map((boostId) => {
                                    const hasBoost = legacyBoosts.includes(boostId);
                                    const reward = LEGACY_BOOST_REWARDS[boostId];
                                    const packNumber = boostId.split('_')[1];
                                    return (
                                        <div key={boostId} className={cn("flex justify-between items-center text-sm", hasBoost ? "text-foreground" : "text-muted-foreground/50")}>
                                            <span>Booster Pack {packNumber}</span>
                                            <span className={cn(hasBoost ? "font-bold text-gold" : "line-through")}>
                                                {reward.toLocaleString()} EXN
                                            </span>
                                        </div>
                                    )
                                })}
                                <div className="!mt-4 pt-2 border-t border-primary/20 flex justify-between items-center text-lg font-bold">
                                    <span>Total Reward:</span>
                                    <span className="text-gold">{totalLegacyReward.toLocaleString()} EXN</span>
                                </div>
                            </div>
                            
                        </div>
                        <p className="text-sm text-muted-foreground">Click below to claim your bonus.</p>
                    </div>
                );
            case OnboardingStage.Welcome:
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <Avatar className="w-24 h-24 border-4 border-primary mx-auto">
                            <AvatarImage src={user.photo_url} alt={user.first_name} />
                            <AvatarFallback className="text-3xl">{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <h1 className="text-4xl font-bold text-foreground">Welcome to the Exnus Family!</h1>
                        <p className="text-xl text-primary">{getGreeting()}, {user.first_name}!</p>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            We're thrilled to have you join our mission. Get ready to explore the ecosystem, earn tokens, and be a part of the future of decentralized engagement.
                        </p>
                    </div>
                );
            case OnboardingStage.HowItWorks:
                 return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">How It Works</h1>
                        <p className="text-xl text-muted-foreground">Earning more is simple and rewarding.</p>
                        <div className="text-left max-w-md mx-auto space-y-6 text-lg">
                            <div className="flex items-start gap-4">
                                <Zap className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Daily Tapping</h3>
                                    <p className="text-muted-foreground text-base">Tap the button every day to earn tokens automatically.</p>
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
                                    <p className="text-muted-foreground text-base">Invite friends to join. You'll both earn extra when they sign up with your code.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case OnboardingStage.WelcomeTasks:
                 return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">One Last Thing...</h1>
                        <p className="text-xl text-muted-foreground">Complete your Welcome Tasks to unlock your full potential!</p>
                        <div className="text-left max-w-md mx-auto space-y-6 text-lg">
                            <div className="flex items-start gap-4">
                                <UserCheck className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Welcome Tasks</h3>
                                    <p className="text-muted-foreground text-base">Complete a few simple social tasks to get another bonus and explore the app features.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <Award className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Achievements</h3>
                                    <p className="text-muted-foreground text-base">Unlock achievements by using the app to earn even more rewards.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return  <div className="flex justify-center items-center"><LoadingDots /></div>;
        }
    }

    const getButtonText = () => {
        switch (stage) {
            case OnboardingStage.AccountConversion: return 'Confirm Conversion';
            case OnboardingStage.LegacyBoosterReward: return totalLegacyReward > 0 ? 'Claim Reward' : 'Continue';
            case OnboardingStage.HowItWorks: return isNewUser ? 'Continue' : 'Enter App';
            case OnboardingStage.WelcomeTasks: return 'Enter App';
            default: return 'Continue';
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-fade-in">
            <div className="flex-grow flex flex-col items-center justify-center w-full">
                {renderStageContent()}
            </div>
            <div className="w-full max-w-sm pb-8">
                <Button onClick={handleNext} disabled={isLoading || stage === null} className="w-full h-12 text-lg">
                    {isLoading ? <LoadingDots /> : getButtonText()}
                </Button>
            </div>
        </div>
    );
};

export default Onboarding;
