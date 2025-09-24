
'use client';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyStreakProps {
  streak: number;
}

const DailyStreak = ({ streak }: DailyStreakProps) => {
  const days = Array.from({ length: 7 }, (_, i) => i < streak);

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-primary/90">Daily Login Streak</h3>
        <div className="flex items-center space-x-1 text-gold">
          <Flame className="w-5 h-5" />
          <span className="font-bold">{streak} Days</span>
        </div>
      </div>
      <div className="flex justify-between space-x-1">
        {days.map((active, index) => (
          <div key={index} className="flex flex-col items-center space-y-2 flex-1 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-full flex flex-col items-center justify-center transition-all",
              active ? "bg-gold/80 shadow-lg shadow-gold/30" : "bg-primary/20"
            )}>
              <span className={cn(
                "text-xs font-bold",
                active ? "text-background" : "text-primary/50"
              )}>200</span>
               <span className={cn("text-[8px]", active ? "text-background/80" : "text-primary/40")}>EXN</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">Day {index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyStreak;

    