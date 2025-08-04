
'use client';

import { useState, useEffect } from 'react';
import { Trophy, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Users } from 'lucide-react';
import Footer from '@/components/footer';
import { getLeaderboardUsers, getTotalUsersCount, UserData } from '@/lib/database';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { Skeleton } from '@/components/ui/skeleton';

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
    photo_url?: string;
}

const getInitials = (user: UserData) => {
    if (!user.telegramUser) return 'BU'; // Browser User
    const firstNameInitial = user.telegramUser.first_name ? user.telegramUser.first_name[0] : '';
    const lastNameInitial = user.telegramUser.last_name ? user.telegramUser.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || '??';
}

const getDisplayName = (user: UserData) => {
    if (user.telegramUser) {
        return user.telegramUser.first_name || 'Anonymous';
    }
    return 'Browser User';
}

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
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    
    useEffect(() => {
        const init = () => {
          let user: User | null = null;
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
    
    useEffect(() => {
        const fetchLeaderboardData = async () => {
            setIsLoading(true);
            try {
                // Fetch leaderboard and total user count concurrently
                const [{ users: leaderboardUsers }, count] = await Promise.all([
                    getLeaderboardUsers(), // This fetches the top 100 users.
                    getTotalUsersCount()   // This efficiently gets the count from a single document.
                ]);
                setLeaderboard(leaderboardUsers); // Contains max 100 users
                setTotalUsers(count);
            } catch (error) {
                console.error("Failed to fetch leaderboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboardData();
    }, []);
    
    // The total number of pages is based on the limited leaderboard size (100), not all users.
    const totalPages = Math.ceil(leaderboard.length / USERS_PER_PAGE);
    
    const paginatedUsers = leaderboard.slice(
        (currentPage - 1) * USERS_PER_PAGE,
        currentPage * USERS_PER_PAGE
    );
    
    const currentUserRank = currentUser ? leaderboard.findIndex(u => {
        const uId = u.id; // The ID from the database is already in the correct format (e.g., 'user_123' or 'browser_abc')
        const currentId = typeof currentUser.id === 'number' ? `user_${currentUser.id}` : `browser_${currentUser.id}`;
        return uId === currentId;
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
                     <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5 mt-2">
                        <Users className="w-4 h-4" />
                        {totalUsers > 0 ? `${totalUsers.toLocaleString()} Total Players` : ` `}
                    </p>
                </div>

                {isLoading ? <LeaderboardSkeleton /> : (
                <>
                <div className="space-y-2">
                    {paginatedUsers.map((user, index) => {
                        const rank = (currentPage - 1) * USERS_PER_PAGE + index;
                        const currentUserId = currentUser ? (typeof currentUser.id === 'number' ? `user_${currentUser.id}` : `browser_${currentUser.id}`) : null;
                        const isCurrentUser = user.id === currentUserId;

                        return (
                            <Card key={user.id || rank} className={cn("transition-all", isCurrentUser && "border-primary ring-2 ring-primary")}>
                                <CardContent className="p-3 flex items-center space-x-4">
                                    <div className="flex-shrink-0 flex items-center justify-center w-6">
                                        {getMedal(rank)}
                                    </div>
                                    <Avatar className="w-10 h-10 flex-shrink-0">
                                        <AvatarImage src={user.telegramUser?.photo_url || user.customPhotoUrl} />
                                        <AvatarFallback>{getInitials(user)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold truncate">{getDisplayName(user)}</p>
                                        <p className="text-xs text-muted-foreground truncate">@{user.telegramUser?.username || 'N/A'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-auto pl-2">
                                        <p className="font-bold text-gold">{user.balance.toLocaleString()}</p>
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


                {currentUserData && (currentPage * USERS_PER_PAGE) < currentUserRank + 1 && (
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
                                        <AvatarImage src={currentUserData.telegramUser?.photo_url || currentUserData.customPhotoUrl} />
                                        <AvatarFallback>{getInitials(currentUserData)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold truncate">{getDisplayName(currentUserData)}</p>
                                        <p className="text-xs text-muted-foreground truncate">@{currentUserData.telegramUser?.username || 'N/A'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-auto pl-2">
                                        <p className="font-bold text-gold">{currentUserData.balance.toLocaleString()}</p>
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
