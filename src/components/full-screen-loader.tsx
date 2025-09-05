
'use client';
import { Loader2 } from 'lucide-react';

const FullScreenLoader = () => (
  <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
    <Loader2 className="w-24 h-24 animate-spin text-primary" />
    <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Exnus Points</h1>
  </div>
);

export default FullScreenLoader;
