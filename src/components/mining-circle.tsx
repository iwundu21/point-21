
'use client';
import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { Zap, ShieldAlert, Loader2, Gift, UserCheck, Handshake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface MiningCircleProps {
  isActive: boolean;
  endTime: number | null;
  onActivate: () => void;
  onSessionEnd: () => void;
  isActivating: boolean;
  hasRedeemedReferral: boolean;
  hasCompletedWelcomeTasks: boolean;
  isVerified: boolean;
  miningReward: number;
}

const TOTAL_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const formatTime = (ms: number): string => {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const MiningCircle: FC<MiningCircleProps> = ({ 
  isActive, 
  endTime, 
  onActivate, 
  onSessionEnd, 
  isActivating, 
  hasRedeemedReferral, 
  hasCompletedWelcomeTasks, 
  isVerified,
  miningReward
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const router = useRouter();

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
        setEarnedPoints(miningReward);
        onSessionEnd();
      } else {
        const timeElapsed = TOTAL_DURATION - remaining;
        const currentProgress = (timeElapsed / TOTAL_DURATION) * 100;
        setTimeLeft(remaining);
        setProgress(currentProgress);
        setEarnedPoints(Math.floor((currentProgress / 100) * miningReward));
      }
    };
    
    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);

    return () => clearInterval(intervalId);
  }, [isActive, endTime, onSessionEnd, miningReward]);

  const conicGradientStyle = {
    background: `conic-gradient(hsl(var(--gold)) ${progress}%, transparent ${progress}%)`,
  };

  const handleClick = () => {
    if (isActivating || isActive) return;

    if (!hasRedeemedReferral) {
        router.push('/referral');
        return;
    }
    if (!hasCompletedWelcomeTasks) {
        router.push('/welcome-tasks');
        return;
    }
    if (!isVerified) {
        router.push('/profile');
        return;
    }

    onActivate();
  };

  const getButtonState = () => {
    if (isActivating) return { disabled: true, text: 'Activating...', icon: <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-gold animate-spin" />, className: 'border-gold/70' };
    if (isActive) return { disabled: true, text: 'Mining Active', icon: <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-gold animate-fast-pulse" />, className: 'shadow-gold/20 border-gold/70' };

    if (!hasRedeemedReferral) {
      return { disabled: false, text: 'Redeem Code', icon: <Handshake className="w-12 h-12 sm:w-16 sm:h-16 text-destructive" />, className: 'border-destructive/50 animate-heartbeat' };
    }
    if (!hasCompletedWelcomeTasks) {
      return { disabled: false, text: 'Complete Tasks', icon: <Gift className="w-12 h-12 sm:w-16 sm:h-16 text-destructive" />, className: 'border-destructive/50 animate-heartbeat' };
    }
    if (!isVerified) {
      return { disabled: false, text: 'Verification Needed', icon: <ShieldAlert className="w-12 h-12 sm:w-16 sm:h-16 text-destructive" />, className: 'border-destructive/50 animate-heartbeat' };
    }
    return { disabled: false, text: 'Activate Mining', icon: <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/70" />, className: 'border-muted-foreground/50 hover:bg-muted-foreground/10 hover:border-muted-foreground hover:scale-105 animate-heartbeat' };
  };

  const getHelperText = () => {
    if (isActivating) return 'Your mining rig is firing up...';
    if (isActive) return 'Your 24-hour mining session is active. E-points will be added automatically.';
    if (!hasRedeemedReferral) return 'First, redeem a referral code to continue.';
    if (!hasCompletedWelcomeTasks) return 'Next, complete all the welcome tasks.';
    if (!isVerified) return 'Please complete face verification on your profile to start mining.';
    return `Activate a 24-hour mining session to earn ${miningReward.toLocaleString()} E-points`;
  }

  const { disabled, text, icon, className: stateClassName } = getButtonState();

  return (
    <div className="flex flex-col items-center space-y-4">
      <button
        onClick={handleClick}
        disabled={disabled}
        aria-label={isActive ? `Mining session active, time left: ${formatTime(timeLeft)}` : 'Activate Mining'}
        className={cn(
          'relative w-56 h-56 sm:w-64 sm:h-64 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-in-out disabled:cursor-not-allowed',
          'bg-transparent border-4 text-foreground backdrop-blur-sm',
           stateClassName
        )}
      >
        <div 
          className="absolute inset-[-4px] rounded-full transition-all duration-1000 ease-linear opacity-50"
          style={isActive || isActivating ? conicGradientStyle : {}}
        ></div>
        <div className="relative w-[13rem] h-[13rem] sm:w-56 sm:h-56 rounded-full bg-card/90 flex flex-col items-center justify-center text-center">
            {icon}
             {isActive ? (
              <div className="mt-2 text-center">
                 <p className="text-xl sm:text-2xl font-bold tracking-tighter">{earnedPoints.toLocaleString()}/{miningReward.toLocaleString()}</p>
                 <p className="text-xl sm:text-2xl font-mono font-bold tracking-wider">{formatTime(timeLeft)}</p>
              </div>
            ) : (
                <p className="mt-4 text-lg sm:text-xl font-semibold">{text}</p>
            )}
        </div>
      </button>
      <p className="text-center text-sm text-muted-foreground max-w-xs">
        {getHelperText()}
      </p>
    </div>
  );
};

export default MiningCircle;
