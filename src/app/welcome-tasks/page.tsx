
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Gift, CheckCircle } from 'lucide-react';
import { getUserData, saveUserData } from '@/lib/database';
import TaskItem from '@/components/task-item';
import { Skeleton } from '@/components/ui/skeleton';

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
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 28 21" fill="currentColor" {...props}>
        <path d="M23.021 1.684C21.312.79 19.457.245 17.526.042L17.45.021c-.021 0-.042.021-.063.042-.147.252-.273.546-.378.84c-1.638-.44-3.318-.44-4.977 0-.105-.294-.23-.588-.378-.84a.083.083 0 0 0-.063-.042l-.084.021C9.564.245 7.709.79 6.001 1.684c-2.162 1.11-3.692 2.912-4.634 5.09C.28 9.545 0 12.33 0 15.135c0 4.316 2.537 7.962 6.273 9.62l.063.021c.105.042.21.063.336.063.21 0 .42-.063.566-.189.44-.314.692-.818.587-1.34C7.66 22.753 7.534 22.21 7.43 21.648c-.084-.461.042-.922.378-1.258a.063.063 0 0 1 .063-.021c.02 0 .04.02.06.04l.02.02c.483.42.987.798 1.512 1.132a.063.063 0 0 0 .084-.021c.021-.021.042-.063.021-.084-.335-.42-.65-.86-.944-1.32a.083.083 0 0 1 .022-.105c.02-.02.06-.02.08.02l.02.02c4.863 3.333 10.167 3.333 15.03 0l.021-.021c.021-.042.063-.042.084-.021.042.021.063.063.021.105-.294.461-.609.9-1.007 1.32a.063.063 0 0 0 .021.084c.021.021.063.042.084.021.524-.335 1.028-.713 1.512-1.132l.021-.021c.021-.021.042-.042.063-.042a.063.063 0 0 1 .063.021c.336.336.462.797.378 1.258-.105.562-.23 1.105-.378 1.668.021.52-.252 1.025-.67 1.34a.72.72 0 0 1-.588.19c.126-.021.23-.042.336-.063l.063-.021c3.736-1.658 6.273-5.304 6.273-9.62 0-2.784-.28-5.569-1.362-8.15C26.713 4.596 25.183 2.794 23.02.684zM9.47 16.5c-1.258 0-2.285-1.216-2.285-2.724s1.027-2.724 2.285-2.724c1.278 0 2.306 1.216 2.285 2.724S10.748 16.5 9.47 16.5zm8.997 0c-1.258 0-2.285-1.216-2.285-2.724s1.027-2.724 2.285-2.724c1.278 0 2.306 1.216 2.285 2.724S19.745 16.5 18.467 16.5z"/>
    </svg>
);

export default function WelcomeTasksPage() {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [tasks, setTasks] = useState<WelcomeTasks>({
        followedOnX: false,
        subscribedOnTelegram: false,
        joinedDiscord: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [verifyingTaskId, setVerifyingTaskId] = useState<keyof WelcomeTasks | null>(null);

    useEffect(() => {
        const init = () => {
            let telegramUser: TelegramUser | null = null;
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                 if (tg.initDataUnsafe?.user) {
                    telegramUser = tg.initDataUnsafe.user;
                    tg.ready();
                }
            }

            if (telegramUser) {
                setUser(telegramUser);
            } else {
                const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', language_code: 'en' };
                setUser(mockUser);
            }
        }
        init();
    }, []);

    useEffect(() => {
        const loadTaskData = async () => {
            if (user) {
                setIsLoading(true);
                try {
                    const userData = await getUserData(user);
                    if(userData.welcomeTasks) {
                        setTasks(userData.welcomeTasks);
                    }
                } catch(error) {
                    console.error("Failed to load task data:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        }
        loadTaskData();
    }, [user]);

    const handleTaskComplete = (taskName: keyof WelcomeTasks, link: string) => {
        if (!user || tasks[taskName] || verifyingTaskId) return;

        window.open(link, '_blank');
        
        setVerifyingTaskId(taskName);

        setTimeout(async () => {
             if (user) { // check user again inside timeout
                const userData = await getUserData(user);
                const updatedTasks = { ...userData.welcomeTasks, [taskName]: true };
                const updatedBalance = userData.balance + 300;
                
                await saveUserData(user, { welcomeTasks: updatedTasks, balance: updatedBalance });

                setTasks(updatedTasks);
            }
            setVerifyingTaskId(null);
        }, 9000);
    };

    const allTasksCompleted = Object.values(tasks).every(Boolean);

    if (isLoading || !user) {
      return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-20">
                <main className="flex-grow flex flex-col p-4 mt-8">
                    <div className="w-full max-w-sm mx-auto space-y-8">
                        <div className="text-center space-y-2">
                           <Skeleton className="h-8 w-48 mx-auto" />
                           <Skeleton className="h-4 w-64 mx-auto" />
                        </div>
                        <div className="space-y-4">
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                        </div>
                    </div>
                </main>
            </div>
            <Footer />
        </div>
      )
    }

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
                                link="https://x.com/exnusprotocol"
                                completed={tasks.followedOnX}
                                isVerifying={verifyingTaskId === 'followedOnX'}
                                onComplete={() => handleTaskComplete('followedOnX', 'https://x.com/exnusprotocol')}
                           />
                           <TaskItem
                                icon={<TelegramIcon className="w-6 h-6" />}
                                title="Subscribe on Telegram"
                                description="Get announcements directly from the source."
                                points={300}
                                link="https://t.me/Exnusprotocol"
                                completed={tasks.subscribedOnTelegram}
                                isVerifying={verifyingTaskId === 'subscribedOnTelegram'}
                                onComplete={() => handleTaskComplete('subscribedOnTelegram', 'https://t.me/Exnusprotocol')}
                           />
                           <TaskItem
                                icon={<DiscordIcon className="w-6 h-6" />}
                                title="Join our Discord"
                                description="Become a part of our community."
                                points={300}
                                link="https://discord.gg/v8MpYYFdP8"
                                completed={tasks.joinedDiscord}
                                isVerifying={verifyingTaskId === 'joinedDiscord'}
                                onComplete={() => handleTaskComplete('joinedDiscord', 'https://discord.gg/v8MpYYFdP8')}
                           />
                        </div>

                         {!isLoading && allTasksCompleted && (
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
