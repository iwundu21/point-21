
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Gift, CheckCircle } from 'lucide-react';
import { getUserData, saveUserData } from '@/lib/database';
import TaskItem from '@/components/task-item';
import { verifyTelegramTask } from '@/ai/flows/verify-telegram-task-flow';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Image from 'next/image';
import { TelegramUser } from '@/lib/user-utils';

type WelcomeTasks = {
    followedOnX: boolean;
    subscribedOnTelegram: boolean;
    joinedDiscord: boolean;
    joinedTelegramCommunity: boolean;
};

export default function WelcomeTasksPage() {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [tasks, setTasks] = useState<WelcomeTasks>({
        followedOnX: false,
        subscribedOnTelegram: false,
        joinedDiscord: false,
        joinedTelegramCommunity: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [verifyingTaskId, setVerifyingTaskId] = useState<keyof WelcomeTasks | null>(null);
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogTitle, setDialogTitle] = useState('');
    const [dialogDescription, setDialogDescription] = useState('');

    const showDialog = (title: string, description: string) => {
        setDialogTitle(title);
        setDialogDescription(description);
        setDialogOpen(true);
    };

    useEffect(() => {
        const init = () => {
            let currentUser: TelegramUser | null = null;
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
                const tg = window.Telegram.WebApp;
                currentUser = tg.initDataUnsafe.user;
                tg.ready();
            } else if (typeof window !== 'undefined') {
                let browserId = localStorage.getItem('browser_user_id');
                if (!browserId) {
                    browserId = uuidv4();
                    localStorage.setItem('browser_user_id', browserId);
                }
                currentUser = { id: browserId, first_name: 'Browser User' };
            }

            if (currentUser) {
                setUser(currentUser);
            } else {
                setIsLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        const loadTaskData = async () => {
            if (user) {
                setIsLoading(true);
                try {
                    const { userData } = await getUserData(user);
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
    
    const isBrowserUser = user?.first_name === 'Browser User';

    const handleTaskComplete = async (taskName: keyof WelcomeTasks, link: string, chatId?: string) => {
        if (!user || tasks[taskName] || verifyingTaskId) return;

        window.open(link, '_blank');
        
        setVerifyingTaskId(taskName);

        // Browser user: complete immediately without verification
        if (isBrowserUser) {
             setTimeout(async () => {
                 if (user) { 
                    const { userData } = await getUserData(user);
                    const updatedTasks = { ...userData.welcomeTasks, [taskName]: true };
                    const updatedBalance = userData.balance + 80;
                    
                    await saveUserData(user, { welcomeTasks: updatedTasks, balance: updatedBalance });

                    setTasks(updatedTasks);
                    showDialog("Success!", "You've earned 80 EXN.");
                }
                setVerifyingTaskId(null);
            }, 10000); // 10 second delay to simulate action
            return;
        }

        // Telegram user verification logic
        if (chatId) { // This is a Telegram task that needs verification
            if (typeof user.id !== 'number') { // Should not happen if not browser user, but good check
                 setVerifyingTaskId(null);
                 return;
            }
             try {
                const result = await verifyTelegramTask({ userId: user.id, chatId: chatId });
                if (result.isMember) {
                    const { userData } = await getUserData(user);
                    const updatedTasks = { ...userData.welcomeTasks, [taskName]: true };
                    const updatedBalance = userData.balance + 80;
                    await saveUserData(user, { welcomeTasks: updatedTasks, balance: updatedBalance });
                    setTasks(updatedTasks);
                    showDialog("Success!", "You've earned 80 EXN.");
                } else {
                    showDialog("Verification Failed", result.error || "You must join the channel first.");
                }
            } catch (e) {
                console.error(e);
                showDialog("Error", "Could not verify task completion.");
            } finally {
                setVerifyingTaskId(null);
            }
        } else {
            // Non-verifiable tasks for Telegram users (e.g., X, Discord)
            setTimeout(async () => {
                 if (user) { 
                    const { userData } = await getUserData(user);
                    const updatedTasks = { ...userData.welcomeTasks, [taskName]: true };
                    const updatedBalance = userData.balance + 80;
                    
                    await saveUserData(user, { welcomeTasks: updatedTasks, balance: updatedBalance });

                    setTasks(updatedTasks);
                    showDialog("Success!", "You've earned 80 EXN.");
                }
                setVerifyingTaskId(null);
            }, 9000); // 9 second delay for user to perform action
        }
    };

    const allTasksCompleted = Object.values(tasks).every(Boolean);

    if (isLoading || !user) {
      return null;
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-20">
                <main className="flex-grow flex flex-col p-4 mt-8">
                    <div className="w-full max-w-sm mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                                <Gift className="w-8 h-8 text-primary" />
                                Welcome Tasks
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Complete these one-time tasks to get a head start!
                            </p>
                        </div>

                        <div className="space-y-4">
                           <TaskItem
                                icon={<Image src="/x.jpg" alt="X/Twitter" width={24} height={24} />}
                                title="Follow on X"
                                description="Stay up-to-date with our latest news."
                                points={80}
                                link="https://x.com/exnusprotocol"
                                completed={tasks.followedOnX}
                                isVerifying={verifyingTaskId === 'followedOnX'}
                                onComplete={() => handleTaskComplete('followedOnX', 'https://x.com/exnusprotocol')}
                           />
                           <TaskItem
                                icon={<Image src="/tg.jpg" alt="Telegram" width={24} height={24} />}
                                title="Subscribe on Telegram"
                                description="Get announcements directly from the source."
                                points={80}
                                link="https://t.me/Exnusprotocol"
                                completed={tasks.subscribedOnTelegram}
                                isVerifying={verifyingTaskId === 'subscribedOnTelegram'}
                                onComplete={() => handleTaskComplete('subscribedOnTelegram', 'https://t.me/Exnusprotocol', '@Exnusprotocol')}
                           />
                            <TaskItem
                                icon={<Image src="/tg.jpg" alt="Telegram" width={24} height={24} />}
                                title="Join Telegram Community"
                                description="Chat with other members."
                                points={80}
                                link="https://t.me/exnusprotocolchat"
                                completed={tasks.joinedTelegramCommunity}
                                isVerifying={verifyingTaskId === 'joinedTelegramCommunity'}
                                onComplete={() => handleTaskComplete('joinedTelegramCommunity', 'https://t.me/exnusprotocolchat', '@exnusprotocolchat')}
                           />
                           <TaskItem
                                icon={<Image src="/discord.jpg" alt="Discord" width={24} height={24} />}
                                title="Join our Discord"
                                description="Become a part of our community."
                                points={80}
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
            <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                      <AlertDialogDescription>
                          {dialogDescription}
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogAction onClick={() => setDialogOpen(false)}>OK</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </div>
    );
}

    
