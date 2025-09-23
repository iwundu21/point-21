
'use client';

import { useState, useEffect } from 'react';
import Footer from '@/components/footer';
import { Award, Loader2 } from 'lucide-react';
import { getUserData, UserData } from '@/lib/database';
import AchievementCard from '@/components/achievement-card';
import DailyStreak from '@/components/daily-streak';
import RankCard from '@/components/rank-card';
import { v4 as uuidv4 } from 'uuid';
import { TelegramUser } from '@/lib/user-utils';
import { getUserRank } from '@/lib/database';

export default function AchievementsPage() {
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [rankInfo, setRankInfo] = useState<{ rank: number; league: string }>({ rank: 0, league: 'Unranked' });

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
        const loadUserData = async () => {
            if (user) {
                setIsLoading(true);
                try {
                     const [dataResponse, userRankInfo] = await Promise.all([
                        getUserData(user),
                        getUserRank(user)
                    ]);
                    setUserData(dataResponse.userData);
                    setRankInfo(userRankInfo || { rank: 0, league: 'Unranked' });
                } catch(error) {
                    console.error("Failed to load user data:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        }
        loadUserData();
    }, [user]);

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
            <div className="flex-grow pb-24">
                <main className="flex-grow flex flex-col p-4 mt-8 relative">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                           <Loader2 className="w-12 h-12 animate-spin text-primary" />
                       </div>
                    ) : (
                        <div className="w-full max-w-sm mx-auto space-y-8">
                            <div className="text-center">
                                <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
                                    <Award className="w-8 h-8 text-primary" />
                                    Achievements & Stats
                                </h1>
                            </div>
                            <div className="space-y-4">
                                {userData && (
                                    <>
                                        <DailyStreak streak={userData.dailyStreak.count} />
                                        <RankCard rank={rankInfo.rank} league={rankInfo.league} />
                                        <AchievementCard userData={userData} />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
            <Footer />
        </div>
    );
}
