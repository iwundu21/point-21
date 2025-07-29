
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Gift, CheckCircle } from 'lucide-react';
import { getUserData, saveUserData } from '@/lib/database';
import TaskItem from '@/components/task-item';

declare global {
  interface Window {
    Telegram: any;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  is_premium?: boolean;
  photo_url?: string;
}

type WelcomeTasks = {
    followedOnX: boolean;
    subscribedOnTelegram: boolean;
    joinedDiscord: boolean;
};

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.08l11.07-4.27c.71-.27 1.33.17 1.12.98l-1.89 8.92c-.22.88-1.07 1.1-1.8.61l-4.5-3.35-4.13 3.98c-.41.41-1.1.2-1.28-.31l-1.46-4.3z"/>
    </svg>
);

const DiscordIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M19.54 0c1.356 0 2.46 1.104 2.46 2.472v19.056c0 1.368-1.104 2.472-2.46 2.472h-15.08c-1.356 0-2.46-1.104-2.46-2.472v-19.056c0-1.368 1.104-2.472 2.46-2.472h15.08zm-4.023 5.088h-3.012c-.54 0-.984.444-.984.996v.996h-1.02c-.54 0-.984.444-.984.996v1.992c0 .552.444.996.984.996h1.02v3.996c0 .552.444.996.984.996h3.012c.54 0 .984-.444.984-.996v-3.996h1.02c.54 0 .984-.444.984-.996v-1.992c0-.552-.444-.996-.984-.996h-1.02v-.996c0-.552-.444-.996-.984-.996z"/>
    </svg>
);

export default function WelcomeTasksPage() {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [tasks, setTasks] = useState<WelcomeTasks>({
        followedOnX: false,
        subscribedOnTelegram: false,
        joinedDiscord: false,
    });
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const init = async () => {
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready();
                const telegramUser = tg.initDataUnsafe?.user;
                if (telegramUser) {
                    setUser(telegramUser);
                    const userData = await getUserData(telegramUser);
                    if(userData.welcomeTasks) {
                        setTasks(userData.welcomeTasks);
                    }
                }
            }
        }
        init();
    }, []);

    const handleTaskComplete = async (taskName: keyof WelcomeTasks, link: string) => {
        if (!user || tasks[taskName]) return;

        const userData = await getUserData(user);
        const updatedTasks = { ...tasks, [taskName]: true };
        const updatedBalance = userData.balance + 300;
        
        setTasks(updatedTasks);
        await saveUserData(user, { welcomeTasks: updatedTasks, balance: updatedBalance });

        window.open(link, '_blank');
    };

    const allTasksCompleted = Object.values(tasks).every(Boolean);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-20">
                <main className="flex-grow flex flex-col p-4 mt-8">
                    <div className="w-full max-w-sm mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                                <Gift className="w-8 h-8" />
                                Welcome Tasks
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Complete these one-time tasks to get a head start!
                            </p>
                        </div>

                        <div className="space-y-4">
                           <TaskItem
                                icon={<XIcon className="w-6 h-6" />}
                                title="Follow on X"
                                description="Stay up-to-date with our latest news."
                                points={300}
                                link="https://x.com/Exnus_EXN"
                                completed={tasks.followedOnX}
                                onComplete={() => handleTaskComplete('followedOnX', 'https://x.com/Exnus_EXN')}
                           />
                           <TaskItem
                                icon={<TelegramIcon className="w-6 h-6" />}
                                title="Subscribe on Telegram"
                                description="Get announcements directly from the source."
                                points={300}
                                link="https://t.me/Exnus_EXN"
                                completed={tasks.subscribedOnTelegram}
                                onComplete={() => handleTaskComplete('subscribedOnTelegram', 'https://t.me/Exnus_EXN')}
                           />
                           <TaskItem
                                icon={<DiscordIcon className="w-6 h-6" />}
                                title="Join our Discord"
                                description="Become a part of our community."
                                points={300}
                                link="https://discord.gg/exnus"
                                completed={tasks.joinedDiscord}
                                onComplete={() => handleTaskComplete('joinedDiscord', 'https://discord.gg/exnus')}
                           />
                        </div>

                         {isClient && allTasksCompleted && (
                           <div className="flex items-center justify-center gap-2 text-green-500 font-semibold p-4 bg-green-500/10 rounded-lg">
                                <CheckCircle className="w-6 h-6" />
                                <span>All welcome tasks completed!</span>
                           </div>
                        )}
                    </div>
                </main>
            </div>
            <Footer />
        </div>
    );
}
