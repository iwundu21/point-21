

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, addDoc, serverTimestamp, increment,getCountFromServer, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { TelegramUser } from './user-utils';
import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';


export type AchievementKey = 'firstMining' | 'referredFriend' | 'welcomeTasks' | 'socialTasks' | 'ref10' | 'ref30' | 'ref50' | 'ref100' | 'ref250' | 'ref500';

export interface UserData {
    id: string; // Document ID
    balance: number;
    ePointsBalance?: number; // Legacy balance
    miningEndTime: number | null;
    miningRate: number;
    dailyStreak: { count: number; lastLogin: string };
    lastTapTimestamp: number; // Unix timestamp in ms
    walletAddress: string | null;
    telegramUser: TelegramUser | null;
    customPhotoUrl: string | null; // For browser users' custom avatars
    referralCode: string | null;
    referredBy: string | null;
    referralBonusApplied: boolean;
    referrals: number;
    welcomeTasks: {
        followedOnX: boolean;
        subscribedOnTelegram: boolean;
        joinedDiscord: boolean;
        joinedTelegramCommunity: boolean;
    };
    socialTasks: { // Kept for backward compatibility, new tasks use completedSocialTasks
        commentedOnX: boolean;
        likedOnX: boolean;
        retweetedOnX: boolean;
        followedOnX: boolean;
        subscribedOnTelegram: boolean;
    };
    completedSocialTasks: string[]; // Array of completed task IDs
    status: 'active' | 'banned';
    banReason?: string;
    hasMergedBrowserAccount?: boolean;
    purchasedBoosts: string[];
    miningActivationCount: number;
    hasOnboarded?: boolean; // New flag for the new onboarding flow
    claimedAchievements: AchievementKey[]; // Tracks awarded achievements
    claimedBoostReward?: boolean; // Flag for the retroactive booster pack 1 reward
    claimedLegacyBoosts?: boolean; // New flag for the legacy boost rewards
    hasConvertedToExn?: boolean;
    hasReceivedLowBalanceBonus?: boolean; // Flag for the one-time low balance bonus
    hasReceivedMassBonus?: boolean;
}

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export const getUserId = (user: { id: number | string } | null): string => {
    if (!user) return 'guest';
    // Prefix to distinguish between ID types
    return typeof user.id === 'number' ? `user_${user.id}` : `browser_${user.id}`;
};

const defaultUserData = (user: TelegramUser | null): Omit<UserData, 'id'> => ({
    balance: 0,
    miningEndTime: 0,
    miningRate: 0, // Obsolete
    dailyStreak: { count: 0, lastLogin: '' },
    lastTapTimestamp: 0,
    walletAddress: null,
    telegramUser: user && typeof user.id === 'number' ? user as TelegramUser : null,
    customPhotoUrl: null,
    referralCode: null,
    referredBy: null,
    referralBonusApplied: false,
    referrals: 0,
    welcomeTasks: {
        followedOnX: false,
        subscribedOnTelegram: false,
        joinedDiscord: false,
        joinedTelegramCommunity: false,
    },
    socialTasks: { // Obsolete
        commentedOnX: false,
        likedOnX: false,
        retweetedOnX: false,
        followedOnX: false,
        subscribedOnTelegram: false,
    },
    completedSocialTasks: [],
    status: 'active',
    hasMergedBrowserAccount: false,
    purchasedBoosts: [],
    miningActivationCount: 0,
    hasOnboarded: false,
    claimedAchievements: [],
    claimedBoostReward: false,
    claimedLegacyBoosts: false,
    hasReceivedLowBalanceBonus: true, // Default to true for new users
    hasReceivedMassBonus: false,
});

// --- User Count Management ---
const statsRef = doc(db, 'app-stats', 'user-counter');
const telegramUsersStatsRef = doc(db, 'app-stats', 'telegram-user-counter');
const browserUsersStatsRef = doc(db, 'app-stats', 'browser-user-counter');
const MAX_USERS = 300000;


const incrementTelegramUserCount = async () => {
    await setDoc(telegramUsersStatsRef, { count: increment(1) }, { merge: true });
};
const decrementTelegramUserCount = async () => {
    await setDoc(telegramUsersStatsRef, { count: increment(-1) }, { merge: true });
};

const incrementBrowserUserCount = async () => {
    await setDoc(browserUsersStatsRef, { count: increment(1) }, { merge: true });
};
const decrementBrowserUserCount = async () => {
    await setDoc(browserUsersStatsRef, { count: increment(-1) }, { merge: true });
};

export const incrementUserCount = async (userType: 'telegram' | 'browser') => {
    // This function now only increments the specific user type counter, not the main one.
    // The main airdrop counter is now the booster pack counter.
    if (userType === 'telegram') {
        await incrementTelegramUserCount();
    } else {
        await incrementBrowserUserCount();
    }
};

const decrementUserCount = async (userType: 'telegram' | 'browser') => {
    if (userType === 'telegram') {
        await decrementTelegramUserCount();
    } else {
        await decrementBrowserUserCount();
    }
};

export const getTotalUsersCount = async (): Promise<number> => {
    const tgSnap = await getDoc(telegramUsersStatsRef);
    const browserSnap = await getDoc(browserUsersStatsRef);
    const tgCount = tgSnap.exists() ? tgSnap.data().count || 0 : 0;
    const browserCount = browserSnap.exists() ? browserSnap.data().count || 0 : 0;
    return tgCount + browserCount;
};

export const getBoosterPack1UserCount = async (): Promise<number> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('purchasedBoosts', 'array-contains', 'boost_1'));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

export const getUsersWithWalletCount = async (): Promise<number> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('walletAddress', '!=', null));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

export const getTotalTelegramUsersCount = async (): Promise<number> => {
    const statsSnap = await getDoc(telegramUsersStatsRef);
    if (statsSnap.exists()) {
        return statsSnap.data().count || 0;
    }
    return 0;
}

export const getTotalBrowserUsersCount = async (): Promise<number> => {
    const statsSnap = await getDoc(browserUsersStatsRef);
    if (statsSnap.exists()) {
        return statsSnap.data().count || 0;
    }
    return 0;
}


export const getTotalActivePoints = async (): Promise<number> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);

    let total = 0;
    querySnapshot.forEach(doc => {
        total += doc.data().balance || 0;
    });

    return total;
};


// --- Airdrop Stats Management ---
const airdropStatsRef = doc(db, 'app-stats', 'airdrop-stats');
const airdropStatusRef = doc(db, 'app-stats', 'airdrop-status');

export const getAirdropStatus = async (): Promise<{ isAirdropEnded: boolean }> => {
    const docSnap = await getDoc(airdropStatusRef);
    if (docSnap.exists()) {
        return { isAirdropEnded: docSnap.data().isAirdropEnded || false };
    }
    return { isAirdropEnded: false };
}

export const updateAirdropStatus = async (ended: boolean): Promise<{ success: boolean }> => {
    await setDoc(airdropStatusRef, { isAirdropEnded: ended, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true };
}


export const getAirdropStats = async (): Promise<{ totalAirdrop: number }> => {
    const docSnap = await getDoc(airdropStatsRef);
    if (docSnap.exists()) {
        return { totalAirdrop: docSnap.data().totalAirdrop || 200_000_000 };
    }
    // Default value if the document doesn't exist
    return { totalAirdrop: 200_000_000 };
};

export const updateAirdropStats = async (newTotal: number) => {
    await setDoc(airdropStatsRef, { totalAirdrop: newTotal });
};


export const getUserData = async (user: TelegramUser | null): Promise<{ userData: UserData, isNewUser: boolean, isAirdropEnded: boolean }> => {
    const { isAirdropEnded } = await getAirdropStatus();

    if (!user) return { userData: { ...defaultUserData(null), id: 'guest' }, isNewUser: false, isAirdropEnded };
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const fetchedData = userSnap.data() as Partial<UserData>;
        let dataToUpdate: Partial<UserData> = {};
        
        if (!fetchedData.referralCode) {
            dataToUpdate.referralCode = generateReferralCode();
        }

        // --- Daily Streak Logic ---
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const lastLoginStr = fetchedData.dailyStreak?.lastLogin;
        
        if (lastLoginStr !== todayStr) {
            let newStreakCount = 1;
            if (lastLoginStr) {
                const lastLoginDate = new Date(lastLoginStr);
                const diff = differenceInCalendarDays(today, lastLoginDate);
                
                if (diff === 1) { // Consecutive day
                    const currentStreak = fetchedData.dailyStreak?.count || 0;
                    if (currentStreak === 7) { // Completed a week, reset.
                        newStreakCount = 1;
                    } else {
                        newStreakCount = currentStreak + 1;
                    }
                }
                // If diff > 1, the streak is broken, so it resets to 1 (default).
            }

            dataToUpdate.dailyStreak = {
                count: newStreakCount,
                lastLogin: todayStr,
            };
        }


        // ONE-TIME BONUS LOGIC
        if (fetchedData.balance !== undefined && fetchedData.balance < 7000 && !fetchedData.hasReceivedLowBalanceBonus) {
            dataToUpdate.balance = (fetchedData.balance || 0) + 6000;
            dataToUpdate.hasReceivedLowBalanceBonus = true;
        }


        const finalUserData: UserData = { 
            ...defaultUserData(user), 
            ...fetchedData,
            ...dataToUpdate,
            id: userSnap.id 
        };

        if (typeof user.id === 'number') {
            finalUserData.telegramUser = user as TelegramUser;
        }

        if (Object.keys(dataToUpdate).length > 0) {
            await setDoc(userRef, dataToUpdate, { merge: true });
        }
        
        return { userData: finalUserData, isNewUser: false, isAirdropEnded };
    } else {
        const currentTotalUsers = await getBoosterPack1UserCount(); // Check against booster purchasers
        if (currentTotalUsers >= MAX_USERS) {
            throw new Error("Airdrop capacity reached. No new users can be added.");
        }

        const newUser: Omit<UserData, 'id'> = {
            ...defaultUserData(user),
            referralCode: generateReferralCode(),
        };
        const newUserData = { ...newUser, id: userId };
        await setDoc(userRef, newUser);
        
        const userType = typeof user.id === 'number' ? 'telegram' : 'browser';
        if (userType === 'telegram') await incrementTelegramUserCount(); else await incrementBrowserUserCount();
        
        return { userData: newUserData, isNewUser: true, isAirdropEnded };
    }
};

export const saveUserData = async (user: { id: number | string } | null, data: Partial<Omit<UserData, 'id'>>) => {
    const { isAirdropEnded } = await getAirdropStatus();
    // Prevent balance updates if airdrop has ended
    if (isAirdropEnded && data.balance) {
        delete data.balance;
    }

    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    
    await setDoc(userRef, data, { merge: true });
};

export const findUserByReferralCode = async (code: string): Promise<UserData | null> => {
    if (!code) return null;
    const usersRef = collection(db, "users");
    const q = query(usersRef, where('referralCode', '==', code.trim().toUpperCase()), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { ...defaultUserData(null), ...(userDoc.data() as UserData), id: userDoc.id };
    }
    return null;
}

export const findUserByWalletAddress = async (address: string): Promise<UserData | null> => {
    if (!address) return null;
    const q = query(collection(db, 'users'), where('walletAddress', '==', address.trim()), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { ...defaultUserData(null), ...(userDoc.data() as UserData), id: userDoc.id };
    }
    return null;
};

export const applyReferralBonus = async (newUser: { id: number | string }, referrerCode: string): Promise<UserData | null> => {
    const { isAirdropEnded } = await getAirdropStatus();
    if (isAirdropEnded) return null; // No rewards if airdrop is over

    const referrerData = await findUserByReferralCode(referrerCode);
    if (referrerData) {
        try {
            await runTransaction(db, async (transaction) => {
                const referrerRef = doc(db, 'users', referrerData.id);
                const newUserRef = doc(db, 'users', getUserId(newUser));

                const referrerDoc = await transaction.get(referrerRef);
                const newUserDoc = await transaction.get(newUserRef);

                if (!referrerDoc.exists() || !newUserDoc.exists()) {
                    throw "Documents do not exist!";
                }
                
                const newReferrerBalance = (referrerDoc.data().balance || 0) + 200;
                const newReferralsCount = (referrerDoc.data().referrals || 0) + 1;
                transaction.update(referrerRef, { balance: newReferrerBalance, referrals: newReferralsCount });

                const newUserBalance = (newUserDoc.data().balance || 0) + 70;
                transaction.update(newUserRef, { 
                    balance: newUserBalance,
                    referralBonusApplied: true,
                    referredBy: referrerData.id,
                });
            });

            const { userData } = await getUserData(newUser as TelegramUser);
            return userData;
        } catch (error) {
            console.error("Transaction failed: ", error);
            return null;
        }
    }
    return null;
};

const LEADERBOARD_PAGE_SIZE = 100;

export const getLeaderboardUsers = async (): Promise<{ users: UserData[]}> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('balance', 'desc'), limit(LEADERBOARD_PAGE_SIZE));
    
    const querySnapshot = await getDocs(q);
    
    const users: UserData[] = [];
    querySnapshot.forEach((docSnap) => {
        let userData = { ...defaultUserData(null), ...(docSnap.data() as Omit<UserData, 'id'>), id: docSnap.id };
        users.push(userData);
    });

    return { users };
}

export const getUserRank = async (user: { id: number | string } | null): Promise<{ rank: number; league: string }> => {
    if (!user) return { rank: 0, league: 'Unranked' };

    const { userData: currentUserData } = await getUserData(user as TelegramUser);
    if (!currentUserData) {
        return { rank: 0, league: 'Unranked' };
    }

    const userBalance = currentUserData.balance;
    const totalUsers = await getTotalUsersCount();

    if (totalUsers === 0) return { rank: 0, league: 'Bronze'};

    if (userBalance === 0) {
        return { rank: totalUsers, league: 'Bronze' };
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('balance', '>', userBalance));
    
    const snapshot = await getCountFromServer(q);
    const higherRankedCount = snapshot.data().count;

    const rank = higherRankedCount + 1;

    // Determine league based on rank percentile
    let league = 'Bronze'; // Default for all
    const percentile = (rank / totalUsers) * 100;
    
    if (percentile <= 1) league = 'Diamond';
    else if (percentile <= 10) league = 'Platinum';
    else if (percentile <= 25) league = 'Gold';
    else if (percentile <= 50) league = 'Silver';


    return { rank, league };
};


// --- Admin Functions ---

export const getAllUsers = async (lastVisible?: QueryDocumentSnapshot<DocumentData>, pageSize: number = 20): Promise<{ users: UserData[], lastVisible: QueryDocumentSnapshot<DocumentData> | null }> => {
    const usersRef = collection(db, 'users');
    let q;

    if (lastVisible) {
        q = query(usersRef, orderBy('balance', 'desc'), startAfter(lastVisible), limit(pageSize));
    } else {
        q = query(usersRef, orderBy('balance', 'desc'), limit(pageSize));
    }
    
    const querySnapshot = await getDocs(q);
    
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
        users.push({ ...defaultUserData(null), ...(doc.data() as Omit<UserData, 'id'>), id: doc.id });
    });
    
    const newLastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

    return { users, lastVisible: newLastVisible || null };
};


export const updateUserStatus = async (user: {id: string | number}, status: 'active' | 'banned', reason?: string) => {
    const userDocId = getUserId(user);
    const userRef = doc(db, 'users', userDocId);
    
    const dataToUpdate: Partial<UserData> = { status };
    if (status === 'banned' && reason) {
        dataToUpdate.banReason = reason;
    } else if (status === 'active') {
        dataToUpdate.banReason = '';
    }
    await setDoc(userRef, dataToUpdate, { merge: true });
};

export const updateUserBalance = async (user: {id: string | number }, amount: number, operation: 'set' | 'increment' = 'set'): Promise<number> => {
    const userDocId = getUserId(user);
    const userRef = doc(db, 'users', userDocId);

    if (isNaN(amount)) {
        throw new Error("Invalid balance provided.");
    }
    
    let finalBalance = 0;

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }

        if (operation === 'set') {
            finalBalance = Number(amount);
            transaction.update(userRef, { balance: finalBalance });
        } else { // increment
            const currentBalance = userDoc.data().balance || 0;
            finalBalance = currentBalance + Number(amount);
            transaction.update(userRef, { balance: finalBalance });
        }
    });

    return finalBalance;
};

export const deleteUser = async (user: {id: string | number}) => {
    const userId = getUserId(user);
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userType = userId.startsWith('user_') ? 'telegram' : 'browser';
        await decrementUserCount(userType);
    }
    
    await deleteDoc(userRef);
};


export const banUser = async (user: {id: number | string} | null, reason?: string) => {
    if (!user) return;
    
    const dataToSave: Partial<UserData> = { status: 'banned' };
    if (reason) {
        dataToSave.banReason = reason;
    }
    await saveUserData(user, dataToSave);
}

export const forceAddBoosterPack1 = async (user: {id: string | number}): Promise<number> => {
    const userDocId = getUserId(user);
    const userRef = doc(db, 'users', userDocId);
    
    let finalBalance = 0;
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error(`User ${userDocId} not found`);
        }

        const userData = userDoc.data() as UserData;
        
        if (userData.purchasedBoosts?.includes('boost_1')) {
            finalBalance = userData.balance;
            return;
        }
            
        const REWARD = 5000;
        const newBalance = userData.balance + REWARD;
            
        transaction.update(userRef, {
            balance: newBalance,
            purchasedBoosts: arrayUnion('boost_1')
        });
        finalBalance = newBalance;
    });

    return finalBalance;
};


// --- Social Task Admin Functions ---
export const addSocialTask = async (task: Omit<SocialTask, 'id' | 'createdAt' | 'completionCount'>) => {
    const tasksCollection = collection(db, 'socialTasks');
    await addDoc(tasksCollection, {
        ...task,
        completionCount: 0,
        createdAt: serverTimestamp()
    });
};

export interface SocialTask {
    id: string;
    title: string;
    description: string;
    link: string;
    points: number;
    icon: string;
    createdAt: any; 
    completionCount: number;
}


export const getSocialTasks = async (): Promise<SocialTask[]> => {
    const tasksCollection = collection(db, 'socialTasks');
    const q = query(tasksCollection, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const tasks: SocialTask[] = [];
    querySnapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() } as SocialTask);
    });
    return tasks;
};

export const deleteSocialTask = async (taskId: string) => {
    if (!taskId) return;
    const taskRef = doc(db, 'socialTasks', taskId);
    await deleteDoc(taskRef);
};

export const deleteAllSocialTasks = async (): Promise<number> => {
    const tasksCollection = collection(db, 'socialTasks');
    const querySnapshot = await getDocs(tasksCollection);

    if (querySnapshot.empty) {
        return 0;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });

    await batch.commit();
    return querySnapshot.size;
}

export const incrementTaskCompletionCount = async (taskId: string) => {
    const { isAirdropEnded } = await getAirdropStatus();
    if (isAirdropEnded) return; // No rewards if airdrop is over

    if (!taskId) return;
    const taskRef = doc(db, 'socialTasks', taskId);
    await setDoc(taskRef, { completionCount: increment(1) }, { merge: true });
};

export const mergeBrowserDataToTelegram = async (telegramUser: TelegramUser, browserUserData: UserData): Promise<UserData> => {
    if (!browserUserData || !telegramUser) {
        throw new Error("Invalid user data provided for merge.");
    }
    
    const telegramUserId = getUserId(telegramUser);
    const telegramUserRef = doc(db, 'users', telegramUserId);
    const browserUserRef = doc(db, 'users', browserUserData.id);
    
    await runTransaction(db, async (transaction) => {
        const telegramUserDoc = await transaction.get(telegramUserRef);
        const browserUserDoc = await transaction.get(browserUserRef);

        if (!browserUserDoc.exists()) {
             throw new Error("Browser user does not exist.");
        }
        
        const telegramData = telegramUserDoc.exists() ? telegramUserDoc.data() as UserData : defaultUserData(telegramUser);
        const mergedBalance = (telegramData.balance || 0) + (browserUserData.balance || 0);
       
        transaction.set(telegramUserRef, { 
            balance: mergedBalance,
            walletAddress: browserUserData.walletAddress,
            hasMergedBrowserAccount: true,
        }, { merge: true });
        
        transaction.delete(browserUserRef);
    });
    
    await decrementBrowserUserCount();
    
    const { userData } = await getUserData(telegramUser);
    return userData;
}

export const unbanAllUsers = async (): Promise<number> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('status', '==', 'banned'));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return 0;
    }

    const batch = writeBatch(db);
    querySnapshot.forEach((docSnap) => {
        const userRef = doc(db, 'users', docSnap.id);
        batch.update(userRef, { status: 'active', banReason: '' });
    });

    await batch.commit();
    
    return querySnapshot.size;
}

export const grantMassBonusToAllUsers = async (): Promise<number> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('hasReceivedMassBonus', '!=', true));
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return 0;
    }
    
    let updatedCount = 0;
    const chunks = [];
    for (let i = 0; i < querySnapshot.docs.length; i += 500) {
        chunks.push(querySnapshot.docs.slice(i, i + 500));
    }

    for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((docSnap) => {
            const userRef = doc(db, 'users', docSnap.id);
            const currentBalance = docSnap.data().balance || 0;
            const newBalance = currentBalance + 40000;
            batch.update(userRef, { balance: newBalance, hasReceivedMassBonus: true });
        });
        await batch.commit();
        updatedCount += chunk.length;
    }

    return updatedCount;
};


export const claimDailyMiningReward = async (userId: string): Promise<{ success: boolean, newBalance?: number }> => {
    const { isAirdropEnded } = await getAirdropStatus();
    if (isAirdropEnded) return { success: false }; // No rewards if airdrop is over

    const userRef = doc(db, 'users', userId);
    const twentyFourHoursInMillis = 24 * 60 * 60 * 1000;
    const DAILY_REWARD = 1000;

    try {
        let result: { success: boolean, newBalance?: number } = { success: false };
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }
            const userData = userDoc.data() as UserData;
            const now = Date.now();
            const lastTap = userData.lastTapTimestamp || 0;

            if (now - lastTap < twentyFourHoursInMillis) {
                // Not enough time has passed.
                result = { success: false };
                return;
            }
            
            const newBalance = userData.balance + DAILY_REWARD;

            transaction.update(userRef, {
                balance: newBalance,
                lastTapTimestamp: now,
                miningActivationCount: increment(1)
            });
            result = { success: true, newBalance };
        });

        return result;

    } catch (error) {
        console.error("Failed to claim daily mining reward:", error);
        return { success: false };
    }
}

export const LEGACY_BOOST_REWARDS: Record<string, number> = {
    'boost_1': 5000,
    'boost_2': 10000,
    'boost_3': 30000,
    'boost_4': 40000,
    'boost_5': 50000,
};

export const claimLegacyBoostRewards = async (user: { id: number | string } | null, totalReward: number) => {
    if (!user) return;

    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }
        
        const currentData = userDoc.data();
        if (currentData.claimedLegacyBoosts) {
            return;
        }

        const newBalance = currentData.balance + totalReward;
        transaction.update(userRef, {
            balance: newBalance,
            claimedLegacyBoosts: true,
        });
    });
};

export const convertEPointsToExn = async (user: { id: number | string }): Promise<{ oldBalance: number; newBalance: number }> => {
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    let result = { oldBalance: 0, newBalance: 0 };

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User not found for conversion.");
        }

        const userData = userDoc.data() as UserData;

        if (userData.hasConvertedToExn) {
            result = { oldBalance: userData.balance, newBalance: userData.balance };
            return;
        }
        
        const oldPoints = userData.ePointsBalance || userData.balance;
        const newExn = Math.floor((oldPoints / 1000) * 150);

        transaction.update(userRef, {
            balance: newExn,
            ePointsBalance: 0, // Zero out old balance
            hasConvertedToExn: true,
        });
        
        result = { oldBalance: oldPoints, newBalance: newExn };
    });

    return result;
};


// --- Specific Data Functions ---

export const getBalance = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.balance;
export const getMiningEndTime = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.miningEndTime;
export const getDailyStreak = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.dailyStreak;
export const getWalletAddress = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.walletAddress;
export const saveWalletAddress = async (user: { id: number | string } | null, address: string) => {
    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const currentTotalUsers = await getTotalUsersCount();
        if (currentTotalUsers >= MAX_USERS) {
            throw new Error("Airdrop capacity reached. No new users can be added.");
        }
        // This is a new browser user, create their record now.
        const newUser: Omit<UserData, 'id'> = {
            ...defaultUserData(user as TelegramUser),
            referralCode: generateReferralCode(),
            walletAddress: address,
        };
        await setDoc(userRef, newUser);
    } else {
        // This is an existing user (Telegram or Browser) just updating their wallet.
        await setDoc(userRef, { walletAddress: address }, { merge: true });
    }
}

export const getReferralCode = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.referralCode;
export const saveReferralCode = async (user: { id: number | string } | null, code: string) => saveUserData(user, { referralCode: code });
export const saveUserPhotoUrl = async (user: { id: number | string } | null, photoUrl: string) => saveUserData(user, { customPhotoUrl: photoUrl });


