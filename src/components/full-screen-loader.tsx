
'use client';
import { Loader2 } from 'lucide-react';

const FullScreenLoader = () => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
    <div className="flex items-center justify-center space-x-2">
        <span className="text-xl font-medium text-foreground">Loading...</span>
        <div className="loading-dots flex space-x-1">
            <span className="w-3 h-3 bg-primary rounded-full"></span>
            <span className="w-3 h-3 bg-primary rounded-full"></span>
            <span className="w-3 h-3 bg-primary rounded-full"></span>
            <span className="w-3 h-3 bg-primary rounded-full"></span>
            <span className="w-3 h-3 bg-primary rounded-full"></span>
        </div>
    </div>
  </div>
);

export default FullScreenLoader;
