
'use client';

import React, { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Users, ThumbsUp, Repeat, MessageCircle, CheckCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Info, Star } from 'lucide-react';
import { getUserData, saveUserData, getSocialTasks, SocialTask, UserData, incrementTaskCompletionCount } from '@/lib/database';
import { verifyTelegramTask } from '@/ai/flows/verify-telegram-task-flow';
import TaskItem from '@/components/task-item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
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

declare global {
  interface Window {
    Telegram: any;
  }
}

interface User {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

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

export const renderIcon = (iconName: string, className?: string) => {
    switch(iconName) {
        case 'MessageCircle': return <MessageCircle className={className} />;
        case 'ThumbsUp': return <ThumbsUp className={className} />;
        case 'Repeat': return <Repeat className={className} />;
        case 'Star': return <Star className={className} />;
        case 'XIcon': return <XIcon className={className} />;
        case 'TelegramIcon': return <TelegramIcon className={className} />;
        default: return <Users className={className} />;
    }
}


const TASKS_PER_PAGE = 10;

export default function TasksPage() {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [allTasks, setAllTasks] = useState<SocialTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [verifyingTaskId, setVerifyingTaskId] = useState<string | null>(null);
    const [availableCurrentPage, setAvailableCurrentPage] = useState(1);
    const [completedCurrentPage, setCompletedCurrentPage] = useState(1);
    
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
            let currentUser: User | null = null;
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
                    const [userData, socialTasks] = await Promise.all([
                        getUserData(user),
                        getSocialTasks()
                    ]);
                    setUserData(userData);
                    setAllTasks(socialTasks);
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

    const handleTaskComplete = async (task: SocialTask) => {
        if (!user || !userData || verifyingTaskId || userData.completedSocialTasks?.includes(task.id)) return;

        setVerifyingTaskId(task.id);
        window.open(task.link, '_blank');

        const completeTask = async () => {
             try {
                const freshUserData = await getUserData(user);
                if (freshUserData.completedSocialTasks?.includes(task.id)) {
                    setVerifyingTaskId(null);
                    return; 
                }

                const updatedCompletedTasks = [...(freshUserData.completedSocialTasks || []), task.id];
                const updatedBalance = freshUserData.balance + task.points;
                
                await saveUserData(user, { 
                    completedSocialTasks: updatedCompletedTasks, 
                    balance: updatedBalance 
                });
                await incrementTaskCompletionCount(task.id);
                
                const updatedData = { ...freshUserData, completedSocialTasks: updatedCompletedTasks, balance: updatedBalance };
                setUserData(updatedData);
                showDialog("Success!", `You've earned ${task.points} E-points.`);
            } catch (error) {
                 console.error("Error completing task:", error);
                 showDialog("Error", "Could not complete the task.");
            } finally {
                setVerifyingTaskId(null);
            }
        };

        if (isBrowserUser) {
            setTimeout(completeTask, 8000); // 8-second delay for browser users
            return;
        }

        // Telegram user logic
        if (task.icon === 'TelegramIcon') {
            if (typeof user.id !== 'number') return;
            try {
                const chatId = task.link.substring(task.link.lastIndexOf('/') + 1);
                const result = await verifyTelegramTask({ userId: user.id, chatId });
                if (result.isMember) {
                    await completeTask();
                } else {
                    showDialog("Verification Failed", result.error || "You must join the channel first.");
                    setVerifyingTaskId(null);
                }
            } catch (e) {
                 console.error(e);
                 showDialog("Error", "Could not verify task completion.");
                 setVerifyingTaskId(null);
            }
        } else {
            // Non-verifiable tasks for Telegram users (e.g., X, Discord)
            setTimeout(completeTask, 8000);
        }
    };
    
    const availableTasks = allTasks.filter(task => !userData?.completedSocialTasks?.includes(task.id));
    const completedTasks = allTasks.filter(task => userData?.completedSocialTasks?.includes(task.id));

    // Pagination for Available Tasks
    const totalAvailablePages = Math.ceil(availableTasks.length / TASKS_PER_PAGE);
    const paginatedAvailableTasks = availableTasks.slice(
        (availableCurrentPage - 1) * TASKS_PER_PAGE,
        availableCurrentPage * TASKS_PER_PAGE
    );

    // Pagination for Completed Tasks
    const totalCompletedPages = Math.ceil(completedTasks.length / TASKS_PER_PAGE);
    const paginatedCompletedTasks = completedTasks.slice(
        (completedCurrentPage - 1) * TASKS_PER_PAGE,
        completedCurrentPage * TASKS_PER_PAGE
    );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-20">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
          {isLoading ? null : (
            <div className="w-full max-w-sm mx-auto space-y-8">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-primary" />
                        Social Engagement
                    </h1>
                     <p className="text-sm text-muted-foreground pt-2">
                        Engage with us on social media to earn more E-points!
                    </p>
                </div>
                 {isBrowserUser && (
                    <div className="flex items-center gap-2 p-3 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Info className="w-5 h-5 flex-shrink-0" />
                        <div>
                         Telegram tasks must be completed in the Telegram app to be verified and receive rewards.
                        </div>
                    </div>
                )}

                <Tabs defaultValue="available" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="available">Available</TabsTrigger>
                    <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="available">
                    <div className="space-y-4 pt-4">
                        {paginatedAvailableTasks.length > 0 ? paginatedAvailableTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                icon={renderIcon(task.icon, "w-6 h-6")}
                                title={task.title}
                                description={task.description}
                                points={task.points}
                                link={task.link}
                                completed={false}
                                isVerifying={verifyingTaskId === task.id}
                                onComplete={() => handleTaskComplete(task)}
                            />
                        )) : (
                           <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground font-semibold p-8 bg-primary/5 rounded-lg mt-4">
                                <Info className="w-8 h-8" />
                                <span>No available tasks.</span>
                                <span>Come back later.</span>
                           </div>
                        )}
                    </div>
                    {totalAvailablePages > 1 && (
                         <div className="flex items-center justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {availableCurrentPage} of {totalAvailablePages}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setAvailableCurrentPage(1)} disabled={availableCurrentPage === 1}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setAvailableCurrentPage(p => p - 1)} disabled={availableCurrentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setAvailableCurrentPage(p => p + 1)} disabled={availableCurrentPage === totalAvailablePages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setAvailableCurrentPage(totalAvailablePages)} disabled={availableCurrentPage === totalAvailablePages}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                  </TabsContent>
                  <TabsContent value="completed">
                    <div className="space-y-4 pt-4">
                      {paginatedCompletedTasks.length > 0 ? paginatedCompletedTasks.map(task => (
                          <TaskItem
                              key={task.id}
                              icon={renderIcon(task.icon, "w-6 h-6")}
                              title={task.title}
                              description={task.description}
                              points={task.points}
                              link={task.link}
                              completed={true}
                              isVerifying={false}
                              onComplete={() => {}}
                          />
                      )) : (
                        <div className="text-center text-muted-foreground p-8">
                            You haven't completed any tasks yet.
                        </div>
                      )}
                    </div>
                     {totalCompletedPages > 1 && (
                         <div className="flex items-center justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                                Page {completedCurrentPage} of {totalCompletedPages}
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="icon" onClick={() => setCompletedCurrentPage(1)} disabled={completedCurrentPage === 1}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCompletedCurrentPage(p => p - 1)} disabled={completedCurrentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCompletedCurrentPage(p => p + 1)} disabled={completedCurrentPage === totalCompletedPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" onClick={() => setCompletedCurrentPage(totalCompletedPages)} disabled={completedCurrentPage === totalCompletedPages}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                  </TabsContent>
                </Tabs>
            </div>
          )}
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

    