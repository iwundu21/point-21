
'use client';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

const DailyStreak = () => {
  const currentStreak = 4; // Mock data
  const days = Array.from({ length: 7 }, (_, i) => i < currentStreak);

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-primary/90">Daily Streak</h3>
        <div className="flex items-center space-x-1 text-yellow-400">
          <Flame className="w-5 h-5" />
          <span className="font-bold">{currentStreak} Days</span>
        </div>
      </div>
      <div className="flex justify-between space-x-2">
        {days.map((active, index) => (
          <div key={index} className="flex flex-col items-center space-y-1">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              active ? "bg-yellow-400" : "bg-primary/20"
            )}>
              {active && <Flame className="w-5 h-5 text-white" />}
            </div>
            <p className="text-xs text-muted-foreground">D{index + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyStreak;
