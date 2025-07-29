
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Users, ThumbsUp, Repeat, MessageCircle, CheckCircle } from 'lucide-react';
import { getUserData, saveUserData } from '@/lib/database';
import TaskItem from '@/components/task-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type SocialTasksState = {
    commentedOnX: boolean;
    likedOnX: boolean;
    retweetedOnX: boolean;
    followedOnX: boolean;
    subscribedOnTelegram: boolean;
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

const socialTasksList = [
    {
        id: 'commentedOnX',
        icon: <MessageCircle className="w-6 h-6" />,
        title: "Comment on X",
        description: "Leave a comment on our latest post.",
        points: 100,
        link: "https://x.com/exnusprotocol/status/1815814524223225916",
    },
    {
        id: 'likedOnX',
        icon: <ThumbsUp className="w-6 h-6" />,
        title: "Like on X",
        description: "Show your support by liking our post.",
        points: 100,
        link: "https://x.com/exnusprotocol/status/1815814524223225916",
    },
    {
        id: 'retweetedOnX',
        icon: <Repeat className="w-6 h-6" />,
        title: "Retweet on X",
        description: "Share our post with your followers.",
        points: 100,
        link: "https://x.com/exnusprotocol/status/1815814524223225916",
    },
    {
        id: 'followedOnX',
        icon: <XIcon className="w-6 h-6" />,
        title: "Follow on X",
        description: "Stay up-to-date with our latest news.",
        points: 100,
        link: "https://x.com/exnusprotocol",
    },
    {
        id: 'subscribedOnTelegram',
        icon: <TelegramIcon className="w-6 h-6" />,
        title: "Subscribe on Telegram",
        description: "Get announcements directly from the source.",
        points: 100,
        link: "https://t.me/Exnusprotocol",
    },
];

export default function TasksPage() {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [tasks, setTasks] = useState<SocialTasksState>({
        commentedOnX: false,
        likedOnX: false,
        retweetedOnX: false,
        followedOnX: false,
        subscribedOnTelegram: false,
    });
    const [isLoading, setIsLoading] = useState(true);

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
                    if(userData.socialTasks) {
                        setTasks(userData.socialTasks);
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

    const handleTaskComplete = async (taskName: keyof SocialTasksState, link: string) => {
        if (!user || tasks[taskName]) return;

        const userData = await getUserData(user);
        const task = socialTasksList.find(t => t.id === taskName);
        if (!task) return;

        const updatedTasks = { ...tasks, [taskName]: true };
        const updatedBalance = userData.balance + task.points;
        
        setTasks(updatedTasks);
        await saveUserData(user, { socialTasks: updatedTasks, balance: updatedBalance });

        window.open(link, '_blank');
    };
    
    const availableTasks = socialTasksList.filter(task => !tasks[task.id as keyof SocialTasksState]);
    const completedTasks = socialTasksList.filter(task => tasks[task.id as keyof SocialTasksState]);

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
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Users className="w-8 h-8" />
                        Social Engagement
                    </h1>
                     <p className="text-sm text-muted-foreground pt-2">
                        Engage with us on social media to earn more E-points!
                    </p>
                </div>

                <Tabs defaultValue="available" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">Available</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="available">
                    <div className="space-y-4 pt-4">
                        {availableTasks.length > 0 ? availableTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                icon={task.icon}
                                title={task.title}
                                description={task.description}
                                points={task.points}
                                link={task.link}
                                completed={false}
                                onComplete={() => handleTaskComplete(task.id as keyof SocialTasksState, task.link)}
                            />
                        )) : (
                           <div className="flex items-center justify-center gap-2 text-green-500 font-semibold p-4 bg-green-500/10 rounded-lg mt-4">
                                <CheckCircle className="w-6 h-6" />
                                <span>All social tasks completed!</span>
                           </div>
                        )}
                    </div>
                  </TabsContent>
                  <TabsContent value="completed">
                    <div className="space-y-4 pt-4">
                      {completedTasks.length > 0 ? completedTasks.map(task => (
                          <TaskItem
                              key={task.id}
                              icon={task.icon}
                              title={task.title}
                              description={task.description}
                              points={task.points}
                              link={task.link}
                              completed={true}
                              onComplete={() => {}}
                          />
                      )) : (
                        <div className="text-center text-muted-foreground p-8">
                            You haven't completed any tasks yet.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}
