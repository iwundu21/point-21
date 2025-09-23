

'use client';

import { useState, useEffect } from 'react';
import { TelegramUser } from '@/lib/user-utils';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Gift, Users, Star, CalendarDays, Award, UserCheck, RefreshCw } from 'lucide-react';
import { completeOnboarding } from '@/ai/flows/onboarding-flow';
import { UserData, saveUserData, getUserData } from '@/lib/database';

interface OnboardingProps {
    user: TelegramUser;
    isNewUser: boolean;
    onComplete: () => void;
    initialData: UserData;
}

enum OnboardingStage {
    Conversion,
    BoosterReward,
    Welcome,
    LoyaltyBonus,
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
    const [bonusResult, setBonusResult] = useState<{
        creationDate: string;
        bonus: number;
    } | null>(null);

    // Data for conversion stage
    const oldBalance = initialData.ePointsBalance || 0;
    const newBalance = Math.floor(oldBalance / 1000);

    // Data for booster reward stage
    const BOOSTER_REWARD = 5000;

    useEffect(() => {
        // Determine the initial stage based on user data
        if (!isNewUser && initialData.hasConvertedToExn === false) {
            setStage(OnboardingStage.Conversion);
        } else if (!isNewUser && initialData.purchasedBoosts?.includes('boost_1') && !initialData.claimedBoostReward) {
            setStage(OnboardingStage.BoosterReward);
        } else {
            setStage(OnboardingStage.Welcome);
        }
    }, [isNewUser, initialData]);

    const handleNext = async () => {
        setIsLoading(true);

        try {
            switch (stage) {
                case OnboardingStage.Conversion:
                    await saveUserData(user, {
                        balance: newBalance,
                        hasConvertedToExn: true,
                    });
                     // After conversion, check if they are also eligible for booster reward
                    if (!isNewUser && initialData.purchasedBoosts?.includes('boost_1') && !initialData.claimedBoostReward) {
                        setStage(OnboardingStage.BoosterReward);
                    } else if (initialData.hasOnboarded) {
                        onComplete(); // Already onboarded, just needed conversion
                    } else {
                        setStage(OnboardingStage.Welcome);
                    }
                    break;
                
                case OnboardingStage.BoosterReward:
                    const { userData } = await getUserData(user);
                    await saveUserData(user, {
                        balance: userData.balance + BOOSTER_REWARD,
                        claimedBoostReward: true,
                    });
                     if (initialData.hasOnboarded) {
                        onComplete(); // Already onboarded, just needed reward
                    } else {
                        setStage(OnboardingStage.Welcome);
                    }
                    break;

                case OnboardingStage.Welcome:
                    const result = await completeOnboarding({ user });
                    if (result.success) {
                        setBonusResult({
                            creationDate: result.accountCreationDate,
                            bonus: result.initialBalance
                        });
                        setStage(OnboardingStage.LoyaltyBonus);
                    } else {
                        showErrorAndExit();
                    }
                    break;
                
                case OnboardingStage.LoyaltyBonus:
                    setStage(OnboardingStage.HowItWorks);
                    break;

                case OnboardingStage.HowItWorks:
                    if (isNewUser) {
                        setStage(OnboardingStage.WelcomeTasks);
                    } else {
                        onComplete(); // Existing users finish here
                    }
                    break;
                
                case OnboardingStage.WelcomeTasks:
                    onComplete(); // New users finish here
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
            case OnboardingStage.Conversion:
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">Welcome Back!</h1>
                        <p className="text-xl text-muted-foreground">We've updated our points system.</p>
                         <div className="py-8 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="w-20 h-20 text-primary" />
                            <p className="text-base text-muted-foreground">Your E-Points are being converted to EXN.</p>
                            <div className="mt-4 space-y-2 text-center">
                                <p className="text-lg text-muted-foreground">Previous Balance:</p>
                                <p className="text-3xl font-bold text-muted-foreground line-through">{oldBalance.toLocaleString()} E-Points</p>
                                <p className="text-sm text-primary mt-2">(Ratio: 1000 E-Points = 1 EXN)</p>
                                <p className="text-lg text-gold mt-4">New Balance:</p>
                                <p className="text-5xl font-bold text-gold animate-fast-pulse">{newBalance.toLocaleString()} EXN</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">Click below to confirm the conversion.</p>
                    </div>
                );
            case OnboardingStage.BoosterReward:
                 return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">A Gift For Your Support!</h1>
                        <p className="text-xl text-muted-foreground">Thank you for being an early supporter.</p>
                         <div className="py-8 flex flex-col items-center justify-center gap-4">
                            <Star className="w-20 h-20 text-gold" />
                            <p className="text-base text-muted-foreground">Because you purchased Booster Pack 1, we're giving you a special reward.</p>
                            <p className="text-6xl font-bold text-gold my-4 animate-fast-pulse">{BOOSTER_REWARD.toLocaleString()} EXN</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Click below to claim your bonus.</p>
                    </div>
                );
            case OnboardingStage.Welcome:
                return (
                    <div className="text-center animate-fade-in space-y-4">
                        <h1 className="text-4xl font-bold text-foreground">Welcome to the Exnus Family!</h1>
                        <p className="text-xl text-primary">{getGreeting()}, {user.first_name}!</p>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            We're thrilled to have you join our mission. Get ready to explore the ecosystem, earn tokens, and be a part of the future of decentralized engagement.
                        </p>
                    </div>
                );
            case OnboardingStage.LoyaltyBonus:
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h1 className="text-4xl font-bold text-foreground">Your Loyalty Bonus</h1>
                        <p className="text-xl text-muted-foreground">Based on your account age, here's your head start.</p>
                        <div className="py-8 flex flex-col items-center justify-center gap-4">
                           <div className="flex flex-col items-center justify-center gap-2 mb-4">
                                <CalendarDays className="w-16 h-16 text-primary" />
                                <p className="text-base text-muted-foreground">Account Created:</p>
                                <p className="text-2xl font-bold text-foreground animate-heartbeat">{bonusResult?.creationDate}</p>
                           </div>
                            <Award className="w-16 h-16 text-gold" />
                            <p className="text-base text-muted-foreground">Your Starting Balance:</p>
                            <p className="text-6xl font-bold text-gold my-2 animate-fast-pulse">{bonusResult?.bonus.toLocaleString()} EXN</p>
                        </div>
                        <p className="text-sm text-muted-foreground">This bonus reflects your time in the Telegram ecosystem. The older your account, the bigger the reward.</p>
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
                                    <h3 className="font-bold text-foreground">Daily Mining</h3>
                                    <p className="text-muted-foreground text-base">Activate your mining session every 24 hours to earn tokens automatically.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <Users className="w-8 h-8 text-primary mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-bold text-foreground">Social Tasks</h3>
                                    <p className="text-muted-foreground text-base">Engage with our social media and complete tasks to earn bonus points.</p>
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
                                    <p className="text-muted-foreground text-base">Unlock achievements by using the app to earn even more rewards.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return  <div className="flex justify-center items-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>;
        }
    }

    const getButtonText = () => {
        switch (stage) {
            case OnboardingStage.Conversion: return 'Convert to EXN';
            case OnboardingStage.BoosterReward: return 'Claim Reward';
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
                    {isLoading ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : getButtonText()}
                </Button>
            </div>
        </div>
    );
};

export default Onboarding;
