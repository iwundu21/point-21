
'use client';

import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import Footer from '@/components/footer';
import { getLeaderboardUsers, UserData } from '@/lib/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
    photo_url?: string;
}

const getInitials = (user: UserData) => {
    if (!user.telegramUser) return '??';
    const firstNameInitial = user.telegramUser.first_name ? user.telegramUser.first_name[0] : '';
    const lastNameInitial = user.telegramUser.last_name ? user.telegramUser.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || '??';
}


export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp) {
                const tg = window.Telegram.WebApp;
                tg.ready();
                const telegramUser = tg.initDataUnsafe?.user;
                 if (telegramUser) {
                    setCurrentUser(telegramUser);
                } else {
                     const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', photo_url: 'https://placehold.co/128x128.png' };
                     setCurrentUser(mockUser);
                }
            } else {
                 const mockUser: TelegramUser = { id: 123, first_name: 'Dev', username: 'devuser', photo_url: 'https://placehold.co/128x128.png' };
                 setCurrentUser(mockUser);
            }

            const users = await getLeaderboardUsers();
            setLeaderboard(users);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const currentUserRank = currentUser ? leaderboard.findIndex(u => u.telegramUser?.id === currentUser.id) : -1;
    const currentUserData = currentUserRank !== -1 ? leaderboard[currentUserRank] : null;

    const renderLeaderboardSkeleton = () => (
        <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2">
                    <Skeleton className="h-6 w-6 rounded-md" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-md" />
                </div>
            ))}
        </div>
    );
    
    const getMedal = (rank: number) => {
        if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
        if (rank === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
        if (rank === 2) return <Trophy className="w-5 h-5 text-orange-400" />;
        return <span className="text-sm font-semibold w-5 text-center">{rank + 1}</span>;
    }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-24">
        <main className="flex-grow flex flex-col p-4 mt-8">
             <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Trophy className="w-8 h-8 text-primary" />
                        Leaderboard
                    </h1>
                </div>

                {isLoading ? (
                    renderLeaderboardSkeleton()
                ) : (
                  <>
                    <div className="space-y-2">
                       {leaderboard.slice(0, 10).map((user, index) => (
                           <Card key={user.telegramUser?.id || index} className={cn("transition-all", currentUser?.id === user.telegramUser?.id && "border-primary ring-2 ring-primary")}>
                               <CardContent className="p-3 flex items-center space-x-4">
                                   <div className="flex items-center justify-center w-6">
                                       {getMedal(index)}
                                   </div>
                                   <Avatar className="w-10 h-10">
                                       <AvatarImage src={user.telegramUser?.photo_url} />
                                       <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                   </Avatar>
                                   <div className="flex-grow">
                                       <p className="font-semibold truncate">{user.telegramUser?.first_name || 'Anonymous'}</p>
                                       <p className="text-xs text-muted-foreground">@{user.telegramUser?.username || 'N/A'}</p>
                                   </div>
                                   <div className="text-right">
                                       <p className="font-bold text-primary">{user.balance.toLocaleString()}</p>
                                       <p className="text-xs text-muted-foreground">E-points</p>
                                   </div>
                               </CardContent>
                           </Card>
                       ))}
                    </div>

                    {currentUserData && currentUserRank >= 10 && (
                        <>
                            <Separator />
                            <Card className="border-primary ring-2 ring-primary">
                                <CardHeader className="p-3">
                                   <CardTitle className="text-sm font-normal text-center">Your Ranking</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-0 flex items-center space-x-4">
                                     <div className="flex items-center justify-center w-6">
                                       <span className="text-sm font-semibold w-5 text-center">{currentUserRank + 1}</span>
                                     </div>
                                     <Avatar className="w-10 h-10">
                                       <AvatarImage src={currentUserData.telegramUser?.photo_url} />
                                       <AvatarFallback>{getInitials(currentUserData)}</AvatarFallback>
                                   </Avatar>
                                   <div className="flex-grow">
                                       <p className="font-semibold truncate">{currentUserData.telegramUser?.first_name || 'Anonymous'}</p>
                                       <p className="text-xs text-muted-foreground">@{currentUserData.telegramUser?.username || 'N/A'}</p>
                                   </div>
                                   <div className="text-right">
                                       <p className="font-bold text-primary">{currentUserData.balance.toLocaleString()}</p>
                                       <p className="text-xs text-muted-foreground">E-points</p>
                                   </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                  </>
                )}
            </div>
        </main>
       </div>
      <Footer />
    </div>
  );
}
