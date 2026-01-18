

'use client';

import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { CheckCircle } from 'lucide-react';
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
    isVerifying: boolean;
    onComplete: () => void;
}

const TaskItem = ({ icon, iconName, title, description, points, link, completed, isVerifying, onComplete }: TaskItemProps) => {
    const [commentLink, setCommentLink] = useState('');
    const [isStarted, setIsStarted] = useState(false);

    const isCommentTask = iconName === 'MessageCircle';

    const handleVerifyClick = () => {
        if (isCommentTask && !commentLink) return;
        onComplete();
    };
    
    const handleStartClick = () => {
        window.open(link, '_blank');
        setIsStarted(true);
    };

    // Base content for the task item (icon, title, etc.)
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
            </div>
        </>
    );
    
    // UI for a completed task
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
    
    // UI for a comment task that has been started
    if (isStarted && isCommentTask) {
        return (
            <div className={cn("p-4 rounded-lg flex flex-col sm:flex-row items-center sm:space-x-4 gap-4 transition-all", "bg-primary/5 border-primary/10")}>
                <div className={cn("w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center", "bg-primary/10 text-primary")}>
                    <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
                </div>
                <div className="flex-grow space-y-2 w-full">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold">{title}</h3>
                            <p className="text-xs text-muted-foreground">
                                Paste the link to your comment below to verify.
                            </p>
                        </div>
                         <p className="text-xs font-bold text-gold whitespace-nowrap pl-2">+{points} Points</p>
                    </div>
                    <div className="flex w-full items-center space-x-2">
                        <Input
                            placeholder="Paste your comment link here..."
                            value={commentLink}
                            onChange={(e) => setCommentLink(e.target.value)}
                            disabled={isVerifying}
                        />
                        <Button
                            size="sm"
                            onClick={handleVerifyClick}
                            disabled={isVerifying || !commentLink}
                            className="w-24 shrink-0"
                        >
                            {isVerifying ? <LoadingDots /> : 'Verify'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Default UI for all tasks (Go, Verify, Verifying...)
    return (
        <div className={cn("p-4 rounded-lg flex items-center space-x-4 transition-all", "bg-primary/5 border-primary/10")}>
            {renderContent}
            <div className="w-24 flex justify-center">
                 {isVerifying ? (
                    <Button size="sm" variant="default" disabled className="w-full">
                        <LoadingDots />
                    </Button>
                ) : isStarted ? (
                    <Button size="sm" variant="default" onClick={handleVerifyClick} className="w-full">
                        Verify
                    </Button>
                ) : (
                    <Button size="sm" variant="default" onClick={handleStartClick} className="w-full">
                        Go
                    </Button>
                )}
            </div>
        </div>
    );
};

export default TaskItem;
