

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
    const [isStarted, setIsStarted] = useState(false); // State to manage comment task flow

    const isCommentTask = iconName === 'MessageCircle';

    const handleVerify = () => {
        if (!commentLink) return;
        onComplete();
    };
    
    const handleStartTask = () => {
        window.open(link, '_blank');
        if (isCommentTask) {
            setIsStarted(true);
        } else {
            onComplete();
        }
    }

    if (isCommentTask && !completed) {
        if (!isStarted) {
            // Initial state: show "Go" button to redirect user
            return (
                <div className={cn("p-4 rounded-lg flex items-center space-x-4 transition-all", "bg-primary/5 border-primary/10")}>
                    <div className={cn("w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center", "bg-primary/10 text-primary")}>
                        <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
                    </div>
                    <div className="flex-grow space-y-1">
                        <h3 className="font-semibold">{title}</h3>
                        <p className="text-xs text-muted-foreground">{description}</p>
                        <p className="text-xs font-bold text-gold">+{points} Points</p>
                    </div>
                    <Button
                        size="sm"
                        variant={"default"}
                        onClick={handleStartTask}
                        disabled={completed || isVerifying}
                        className="w-24"
                    >
                        Go
                    </Button>
                </div>
            )
        }
        
        // After starting: show input field for verification
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
                            onClick={handleVerify}
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

    return (
        <div className={cn(
            "p-4 rounded-lg flex items-center space-x-4 transition-all",
            completed ? "bg-green-500/10 border-green-500/20" : "bg-primary/5 border-primary/10"
        )}>
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
            <Button
                size="sm"
                variant={completed ? "ghost" : "default"}
                onClick={handleStartTask}
                disabled={completed || isVerifying}
                className={cn(
                    "w-24",
                    completed && "text-green-500 cursor-default hover:bg-transparent"
                )}
            >
                {isVerifying ? (
                    <div className="flex items-center gap-1">
                        <LoadingDots />
                    </div>
                ) : completed ? (
                    <>
                        <CheckCircle className="w-5 h-5 mr-1" />
                        Done
                    </>
                ) : (
                    'Go'
                )}
            </Button>
        </div>
    );
};

export default TaskItem;

    


