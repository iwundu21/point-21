
'use client';

import { Gift } from 'lucide-react';
import Footer from '@/components/footer';

interface WelcomeTasksPageProps {}

export default function WelcomeTasksPage({}: WelcomeTasksPageProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8">
             <div className="w-full max-w-sm mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Gift className="w-8 h-8" />
                        Welcome Tasks
                    </h1>
                </div>

                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This is where your welcome tasks will be displayed.
                  </p>
                </div>
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}
