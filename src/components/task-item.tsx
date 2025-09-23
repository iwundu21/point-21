
'use client';

import { ReactNode } from 'react';
import { Button } from './ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItemProps {
    icon: ReactNode;
    title: string;
    description: string;
    points: number;
    link: string;
    completed: boolean;
    isVerifying: boolean;
    onComplete: () => void;
}

const TaskItem = ({ icon, title, description, points, link, completed, isVerifying, onComplete }: TaskItemProps) => {
    return (
        <div className={cn(
            "p-4 rounded-lg flex items-center space-x-4 transition-all",
            completed ? "bg-green-500/10 border-green-500/20" : "bg-primary/5 border-primary/10"
        )}>
            <div className={cn(
                "w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center",
                 completed ? "bg-green-500/20 text-green-500" : "bg-primary/10 text-primary"
            )}>
                {icon}
            </div>
            <div className="flex-grow space-y-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
                 <p className="text-xs font-bold text-gold">+{points} EXN</p>
            </div>
            <Button
                size="sm"
                variant={completed ? "ghost" : "default"}
                onClick={onComplete}
                disabled={completed || isVerifying}
                className={cn(
                    "w-24",
                    completed && "text-green-500 cursor-default hover:bg-transparent"
                )}
            >
                {isVerifying ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying
                    </>
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
