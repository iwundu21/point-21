

'use client';

import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import LoadingDots from './loading-dots';
import { Input } from './ui/input';

interface TaskItemProps {
    icon: ReactNode;
    iconName: string;
    title: string;
    description: string;
    points: number;
    link: string;
    completed: boolean;
    isVerifying: boolean; // From parent, for the final step
    onComplete: (commentLink?: string) => void;
}

const TaskItem = ({ icon, iconName, title, description, points, link, completed, isVerifying, onComplete }: TaskItemProps) => {
    type VerificationStep = 'initial' | 'first_verifying' | 'first_failed' | 'second_verifying' | 'ready_to_verify';
    
    const [step, setStep] = useState<VerificationStep>('initial');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [commentLink, setCommentLink] = useState('');

    const isTelegramTask = iconName === 'TelegramIcon';
    const isCommentTask = iconName === 'MessageCircle';
    
    // State for the simple flow (Telegram tasks)
    const [isStarted, setIsStarted] = useState(false); 


    const handleComplexGoClick = () => {
        if (isVerifying) return;

        if (step === 'initial') {
            setStep('first_verifying');
            setTimeout(() => {
                setErrorMessage('Please complete the task to grant the reward.');
                setStep('first_failed');
            }, 7000);
        } else if (step === 'first_failed') {
            setErrorMessage(null);
            window.open(link, '_blank');
            setStep('second_verifying');
            setTimeout(() => {
                setStep('ready_to_verify');
            }, 9000);
        }
    };

    const handleComplexVerifyClick = () => {
        if (isVerifying) return;
        if (isCommentTask && !commentLink) return;
        
        onComplete(commentLink); // Parent will show "Verifying..." for 10s
    };
    
    const handleSimpleGoClick = () => {
        window.open(link, '_blank');
        setIsStarted(true);
    };

    const handleSimpleVerifyClick = () => {
        onComplete();
    };


    const renderContent = (
        <>
            <div className={cn(
                "w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center",
                 completed ? "bg-green-500/20 text-green-500" : "bg-primary/10 text-primary"
            )}>
                <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
            </div>
            <div className="flex-grow space-y-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
                 <p className="text-xs font-bold text-gold">+{points} Points</p>
                 {errorMessage && (
                    <div className="flex items-center gap-1 text-xs text-destructive pt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errorMessage}</span>
                    </div>
                )}
            </div>
        </>
    );

    if (completed) {
        return (
            <div className={cn("p-4 rounded-lg flex items-center space-x-4 transition-all", "bg-green-500/10 border-green-500/20")}>
                {renderContent}
                <Button size="sm" variant="ghost" disabled className={cn("w-24", "text-green-500 cursor-default hover:bg-transparent")}>
                    <CheckCircle className="w-5 h-5 mr-1" />
                    Done
                </Button>
            </div>
        );
    }

    // Simple flow for Telegram tasks
    if (isTelegramTask) {
        return (
             <div className={cn("p-4 rounded-lg flex items-center space-x-4 transition-all", "bg-primary/5 border-primary/10")}>
                {renderContent}
                <div className="w-24 flex justify-center">
                    {isVerifying ? (
                        <Button size="sm" variant="default" disabled className="w-full">
                            <LoadingDots />
                        </Button>
                    ) : isStarted ? (
                        <Button size="sm" variant="default" onClick={handleSimpleVerifyClick} className="w-full">
                            Verify
                        </Button>
                    ) : (
                        <Button size="sm" variant="default" onClick={handleSimpleGoClick} className="w-full">
                            Go
                        </Button>
                    )}
                </div>
            </div>
        );
    }
    
    // Complex flow for other tasks (X, Discord, Comment)
    return (
        <div className={cn("p-4 rounded-lg flex flex-col gap-4 transition-all", "bg-primary/5 border-primary/10")}>
            <div className="flex items-center space-x-4 w-full">
                {renderContent}
                <div className="w-24 flex-shrink-0 flex justify-center">
                   {(step === 'initial' || step === 'first_failed') && (
                       <Button size="sm" variant="default" onClick={handleComplexGoClick} className="w-full">
                           Go
                       </Button>
                   )}
                   {(step === 'first_verifying' || step === 'second_verifying' || isVerifying) && (
                       <Button size="sm" variant="default" disabled className="w-full">
                           <LoadingDots />
                       </Button>
                   )}
                   {step === 'ready_to_verify' && !isVerifying && (
                       <Button size="sm" variant="default" onClick={handleComplexVerifyClick} className="w-full" disabled={isCommentTask && !commentLink}>
                           Verify
                       </Button>
                   )}
                </div>
            </div>
             {isCommentTask && step === 'ready_to_verify' && !isVerifying && (
                <div className="w-full">
                    <Input
                        placeholder="Paste your comment link here..."
                        value={commentLink}
                        onChange={(e) => setCommentLink(e.target.value)}
                        className="h-9"
                    />
                </div>
            )}
        </div>
    );
};

export default TaskItem;
