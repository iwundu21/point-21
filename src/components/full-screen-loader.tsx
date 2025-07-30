
'use client';

import { Loader2 } from 'lucide-react';

const FullScreenLoader = () => {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
};

export default FullScreenLoader;

    