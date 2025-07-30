
'use client';

import { useState, useEffect } from 'react';
import { Trophy, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import Footer from '@/components/footer';
import { getLeaderboardUsers, UserData } from '@/lib/database';
import FullScreenLoader from '@/components/full-screen-loader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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

const getLeagueInfo = (rank: number) => {
    if (rank <= 10) return { name: "Diamond", progress: 100 };
    if (rank <= 100) return { name: "Platinum", progress: ((100 - (rank-10)) / 90) * 100 };
    if (rank <= 1000) return { name: "Gold", progress: ((1000 - (rank-100)) / 900) * 100 };
    if (rank <= 10000) return { name: "Silver", progress: ((10000 - (rank-1000)) / 9000) * 100 };
    return { name: "Bronze", progress: 5 };
};


const USERS_PER_PAGE = 10;

export default function LeaderboardPage() {
    const [leaderboard, setLeaderboard] = useState<UserData[]>([]);
    const [currentUser, setCurrentUser] = useState<TelegramUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    
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
              setCurrentUser(telegramUser);
              fetchLeaderboard();
          } else {
            setIsLoading(false); // No user, stop loading
          }
        };
        init();
    }, []);
    
    const fetchLeaderboard = async () => {
        setIsLoading(true);
        try {
            const { users } = await getLeaderboardUsers();
            setLeaderboard(users);
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const totalPages = Math.ceil(leaderboard.length / USERS_PER_PAGE);
    const paginatedUsers = leaderboard.slice(
        (currentPage - 1) * USERS_PER_PAGE,
        currentPage * USERS_PER_PAGE
    );
    
    const currentUserRank = currentUser ? leaderboard.findIndex(u => u.telegramUser?.id === currentUser.id) : -1;
    const currentUserData = currentUserRank !== -1 ? leaderboard[currentUserRank] : null;

    const getMedal = (rank: number) => {
        if (rank === 0) return <Trophy className="w-5 h-5 text-gray-400" />;
        if (rank === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
        if (rank === 2) return <Trophy className="w-5 h-5 text-orange-400" />;
        return <span className="text-sm font-semibold w-5 text-center">{rank + 1}</span>;
    }


  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
       <div className="flex-grow pb-24">
        <main className="flex-grow flex flex-col p-4 mt-8 relative">
          {isLoading ? <FullScreenLoader /> : (
             <div className="w-full max-w-sm mx-auto space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                        <Trophy className="w-8 h-8 text-primary" />
                        Leaderboard
                    </h1>
                </div>

                <div className="space-y-2">
                    {paginatedUsers.map((user, index) => {
                        const rank = (currentPage - 1) * USERS_PER_PAGE + index;
                        return (
                            <Card key={user.telegramUser?.id || rank} className={cn("transition-all", currentUser?.id === user.telegramUser?.id && "border-primary ring-2 ring-primary")}>
                                <CardContent className="p-3 flex items-center space-x-4">
                                    <div className="flex items-center justify-center w-6">
                                        {getMedal(rank)}
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
                                        <p className="font-bold text-gray-400">{user.balance.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">{getLeagueInfo(rank + 1).name} League</p>
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
                                    <p className="font-bold text-gray-400">{currentUserData.balance.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{getLeagueInfo(currentUserRank + 1).name} League</p>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
          )}
        </main>
       </div>
      <Footer />
    </div>
  );
}

    