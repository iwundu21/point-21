
'use client';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const DailyStreak = () => {
  const currentStreak = 4; // Mock data
  const days = Array.from({ length: 7 }, (_, i) => i < currentStreak);

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-primary/90">Daily Login Streak</h3>
        <div className="flex items-center space-x-1 text-yellow-400">
          <Flame className="w-5 h-5" />
          <span className="font-bold">{currentStreak} Days</span>
        </div>
      </div>
      <div className="flex justify-between space-x-1">
        {days.map((active, index) => (
          <div key={index} className="flex flex-col items-center space-y-2 w-1/7">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              active ? "bg-yellow-400 shadow-lg shadow-yellow-400/30" : "bg-primary/20"
            )}>
              {active && <Flame className="w-6 h-6 text-white" />}
            </div>
            <p className="text-xs text-muted-foreground">Day {index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyStreak;
