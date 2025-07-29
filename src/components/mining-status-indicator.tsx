
'use client';
import { cn } from '@/lib/utils';

interface MiningStatusIndicatorProps {
  isActive: boolean;
}

const MiningStatusIndicator = ({ isActive }: MiningStatusIndicatorProps) => {
  return (
    <div className="flex items-center space-x-2 pt-4 pr-4">
      <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-green-500' : 'bg-red-500')}></div>
      <span className={cn('text-xs font-semibold', isActive ? 'text-green-500' : 'text-red-500')}>
        {isActive ? 'Mining Active' : 'Mining Inactive'}
      </span>
    </div>
  );
};

export default MiningStatusIndicator;
