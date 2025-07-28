
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

const TOTAL_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const TOTAL_POINTS = 1000;

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
  const [progress, setProgress] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  useEffect(() => {
    if (!isActive || !endTime) {
      setTimeLeft(0);
      setProgress(0);
      setEarnedPoints(0);
      return;
    }

    const updateTimer = () => {
      const remaining = endTime - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setProgress(100);
        setEarnedPoints(TOTAL_POINTS);
        onSessionEnd();
      } else {
        const timeElapsed = TOTAL_DURATION - remaining;
        const currentProgress = (timeElapsed / TOTAL_DURATION) * 100;
        setTimeLeft(remaining);
        setProgress(currentProgress);
        setEarnedPoints(Math.floor((currentProgress / 100) * TOTAL_POINTS));
      }
    };
    
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, endTime, onSessionEnd]);

  const conicGradientStyle = {
    background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--card)) ${progress}%)`,
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={!isActive ? onActivate : undefined}
        disabled={isActive}
        aria-label={isActive ? `Forging session active, time left: ${formatTime(timeLeft)}` : 'Activate Mining'}
        className={cn(
          'relative w-64 h-64 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out disabled:cursor-not-allowed',
          'bg-transparent border-4 border-yellow-400/50 text-foreground shadow-lg backdrop-blur-sm',
          isActive && 'shadow-primary/20',
          !isActive && 'hover:bg-yellow-400/10 hover:border-yellow-400 hover:scale-105'
        )}
      >
        <div 
          className="absolute inset-0 rounded-full transition-all duration-1000 ease-linear"
          style={isActive ? conicGradientStyle : {}}
        ></div>
        <div className="relative w-56 h-56 rounded-full bg-card/90 flex flex-col items-center justify-center">
            <Zap className={cn("w-16 h-16 transition-all duration-500", isActive ? "text-primary" : "text-yellow-400/70")} />
            {isActive ? (
              <div className="mt-2 text-center">
                 <p className="text-2xl font-bold tracking-tighter">{earnedPoints}/{TOTAL_POINTS}</p>
                 <p className="text-2xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</p>
              </div>
            ) : (
              <p className="mt-4 text-xl font-semibold">Activate Mining</p>
            )}
        </div>
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
