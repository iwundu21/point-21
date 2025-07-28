'use client';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MiningCircleProps {
  isActive: boolean;
  endTime: number | null;
  onActivate: () => void;
  onSessionEnd: () => void;
}

const formatTime = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const MiningCircle: FC<MiningCircleProps> = ({ isActive, endTime, onActivate, onSessionEnd }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!isActive || !endTime) {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        onSessionEnd();
      } else {
        setTimeLeft(remaining);
      }
    };
    
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, endTime, onSessionEnd]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={!isActive ? onActivate : undefined}
        disabled={isActive}
        aria-label={isActive ? `Forging session active, time left: ${formatTime(timeLeft)}` : 'Start forging session'}
        className={cn(
          'relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out disabled:cursor-not-allowed',
          'bg-card/80 border-4 border-primary/50 text-foreground shadow-lg backdrop-blur-sm',
          isActive && 'animate-subtle-pulse border-primary shadow-primary/20',
          !isActive && 'hover:bg-primary/30 hover:border-primary hover:scale-105'
        )}
      >
        <Zap className={cn("w-16 h-16 transition-all duration-500", isActive ? "text-primary" : "text-primary/70")} />
        {isActive ? (
          <div className="mt-4 text-center">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Forging</p>
            <p className="text-3xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</p>
          </div>
        ) : (
          <p className="mt-4 text-xl font-semibold">Start Forging</p>
        )}
      </button>
      <p className="text-center text-sm text-muted-foreground max-w-xs">
        {isActive
          ? 'Your 24-hour forging session is active. Aether will be added automatically.'
          : 'Activate a 24-hour forging session to earn 1000 Aether.'}
      </p>
    </div>
  );
};

export default MiningCircle;
