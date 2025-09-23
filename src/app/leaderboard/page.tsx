

'use client';

import { useState, useEffect } from 'react';
import { Trophy, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Users, Monitor, Bot } from 'lucide-react';
import Footer from '@/components/footer';
import { getLeaderboardUsers, getTotalTelegramUsersCount, getTotalBrowserUsersCount, UserData } from '@/lib/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials, getDisplayName, TelegramUser } from '@/lib/user-utils';

const getLeagueInfo = (rank: number) => {
    if (rank <= 10) return { name: "Diamond", progress: 100 };
    if (rank <= 100) return { name: "Platinum", progress: ((100 - (rank-10)) / 90) * 100 };
    if (rank <= 1000) return { name: "Gold", progress: ((1000 - (rank-100)) / 900) * 100 };
    if (rank <= 10000) return { name: "Silver", progress: ((10000 - (rank-1000)) / 9000) * 100 };
    return { name: "Bronze", progress: 5 };
};


const USERS_PER_PAGE = 10;
const LEADERBOARD_LIMIT = 100;

const LeaderboardSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
                <CardContent className="p-3 flex items-center space-x-4">
                     <Skeleton className="h-6 w-6 rounded-md" />
                     <Skeleton className="h-10 w-10 rounded-full" />
                     <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                     </div>
                      <div className="flex-shrink-0 space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-3 w-10" />
                     </div>
                </CardContent>
            </Card>
        ))}
    </div>
);


export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
    const [totalTelegramUsers, setTotalTelegramUsers] = useState(0);
    const [totalBrowserUsers, setTotalBrowserUsers] = useState(0);
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    
     useEffect(() => {
        const fetchLeaderboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch all data concurrently for efficiency
                const [leaderboardData, telegramCount, browserCount] = await Promise.all([
                    getLeaderboardUsers(),
                    getTotalTelegramUsersCount(),
                    getTotalBrowserUsersCount()
                ]);

                setLeaderboard(leaderboardData.users);
                setTotalTelegramUsers(telegramCount);
                setTotalBrowserUsers(browserCount);

            } catch (error) {
                console.error("Failed to fetch leaderboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboardData();
    }, []);

    useEffect(() => {
        const init = () => {
          let user: TelegramUser | null = null;
          if (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user) {
              const tg = window.Telegram.WebApp;
              user = tg.initDataUnsafe.user;
              tg.ready();
          } else if (typeof window !== 'undefined') {
              let browserId = localStorage.getItem('browser_user_id');
              if (!browserId) {
                  browserId = uuidv4();
                  localStorage.setItem('browser_user_id', browserId);
              }
              user = { id: browserId, first_name: 'Browser User' };
          }
          
          if (user) {
              setCurrentUser(user);
          }
        };
        init();
    }, []);
    
    // The total number of pages is based on the limited leaderboard size (100), not all users.
    const totalPages = Math.ceil(leaderboard.length / USERS_PER_PAGE);
    
    const paginatedUsers = leaderboard.slice(
        (currentPage - 1) * USERS_PER_PAGE,
        currentPage * USERS_PER_PAGE
    );
    
    const currentUserRank = currentUser ? leaderboard.findIndex(u => {
        if (!u.telegramUser && typeof currentUser.id !== 'number') {
            // It's a browser user
            return u.id === `browser_${currentUser.id}`;
        }
        if (u.telegramUser && typeof currentUser.id === 'number') {
            // It's a telegram user
            return u.telegramUser.id === currentUser.id;
        }
        return false;
    }) : -1;

    const currentUserData = currentUserRank !== -1 ? leaderboard[currentUserRank] : null;

    const getMedal = (rank: number) => {
        if (rank === 0) return <Trophy className="w-5 h-5 text-gold" />;
        if (rank === 1) return <Trophy className="w-5 h-5 text-slate-400" />;
        if (rank === 2) return <Trophy className="w-5 h-5 text-orange-400" />;
        return <span className="text-sm font-semibold w-5 text-center">{rank + 1}</span>;
    }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-24">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
            <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Trophy className="w-8 h-8 text-primary" />
                        Leaderboard
                    </h1>
                     <div className="text-xs text-muted-foreground flex items-center justify-center gap-4 mt-2">
                        {(totalTelegramUsers > 0 || totalBrowserUsers > 0) && (
                            <>
                                <span className="flex items-center gap-1.5"><Bot className="w-4 h-4" /> {totalTelegramUsers.toLocaleString()} Telegram</span>
                                <span className="flex items-center gap-1.5"><Monitor className="w-4 h-4" /> {totalBrowserUsers.toLocaleString()} Browser</span>
                            </>
                        )}
                    </div>
                </div>

                {isLoading ? <LeaderboardSkeleton /> : (
                <>
                <div className="space-y-2">
                    {paginatedUsers.map((user, index) => {
                        const rank = (currentPage - 1) * USERS_PER_PAGE + index;
                        
                        let currentUserId = null;
                        if(currentUser) {
                           if (!user.telegramUser && typeof currentUser.id !== 'number') {
                                currentUserId = `browser_${currentUser.id}`;
                           }
                           if(user.telegramUser && typeof currentUser.id === 'number') {
                                currentUserId = `user_${currentUser.id}`;
                           }
                        }

                        const isCurrentUser = user.id === currentUserId;

                        return (
                            <Card key={user.id || rank} className={cn("transition-all", isCurrentUser && "border-primary ring-2 ring-primary")}>
                                <CardContent className="p-3 flex items-center space-x-4">
                                    <div className="flex-shrink-0 flex items-center justify-center w-6">
                                        {getMedal(rank)}
                                    </div>
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarImage src={user.customPhotoUrl || user.telegramUser?.photo_url} />
                                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold truncate">{getDisplayName(user)}</p>
                                        <p className="text-xs text-muted-foreground truncate">@{user.telegramUser?.username || 'N/A'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-auto pl-2">
                                        <p className="font-bold text-gold">{user.balance.toLocaleString()} EXN</p>
                                        <p className="text-xs text-muted-foreground">{getLeagueInfo(rank + 1).name}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}


                {currentUserData && (currentPage * USERS_PER_PAGE) > currentUserRank && (
                    <>
                        <Separator />
                        <Card className="border-primary ring-2 ring-primary">
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm font-normal text-center">Your Ranking</CardTitle>
                            </CardHeader>
                             <CardContent className="p-3 pt-0 flex items-center space-x-4">
                                    <div className="flex-shrink-0 flex items-center justify-center w-6">
                                       <span className="text-sm font-semibold w-5 text-center">{currentUserRank + 1}</span>
                                    </div>
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarImage src={currentUserData.customPhotoUrl || currentUserData.telegramUser?.photo_url} />
                                        <AvatarFallback>{getInitials(currentUserData)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold truncate">{getDisplayName(currentUserData)}</p>
                                        <p className="text-xs text-muted-foreground truncate">@{currentUserData.telegramUser?.username || 'N/A'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-auto pl-2">
                                        <p className="font-bold text-gold">{currentUserData.balance.toLocaleString()} EXN</p>
                                        <p className="text-xs text-muted-foreground">{getLeagueInfo(currentUserRank + 1).name}</p>
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
