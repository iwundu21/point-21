

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, addDoc, serverTimestamp, increment,getCountFromServer, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { TelegramUser } from './user-utils';

export type AchievementKey = 'verified' | 'firstMining' | 'referredFriend' | 'welcomeTasks' | 'socialTasks';

export interface UserData {
    id: string; // Document ID
    balance: number;
    ePointsBalance?: number; // Legacy balance
    miningEndTime: number | null;
    miningRate: number;
    dailyStreak: { count: number; lastLogin: string };
    lastTapDate: string; // YYYY-MM-DD
    verificationStatus: 'verified' | 'unverified' | 'failed' | 'detecting';
    faceVerificationUri: string | null;
    faceFingerprint: string | null; // Unique identifier for the face
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
    miningEndTime: null,
    miningRate: 0, // Obsolete
    dailyStreak: { count: 0, lastLogin: '' },
    lastTapDate: '',
    verificationStatus: 'unverified',
    faceVerificationUri: null,
    faceFingerprint: null,
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
    await setDoc(statsRef, { count: increment(-1) }, { merge: true });
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

// --- Total Points Management ---
const pointsStatsRef = doc(db, 'app-stats', 'points-counter');

export const incrementTotalPoints = async (amount: number) => {
    if (isNaN(amount) || amount === 0) return;
    await setDoc(pointsStatsRef, { total: increment(amount) }, { merge: true });
}

const decrementTotalPoints = async (amount: number) => {
    if (isNaN(amount) || amount === 0) return;
    await setDoc(pointsStatsRef, { total: increment(-amount) }, { merge: true });
}

export const getTotalActivePoints = async (): Promise<number> => {
    const pointsSnap = await getDoc(pointsStatsRef);
    if (pointsSnap.exists()) {
        return pointsSnap.data().total || 0;
    }
    return 0;
};

// --- Airdrop Stats Management ---
const airdropStatsRef = doc(db, 'app-stats', 'airdrop-stats');

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


export const getUserData = async (user: TelegramUser | null): Promise<{ userData: UserData, isNewUser: boolean }> => {
    if (!user) return { userData: { ...defaultUserData(null), id: 'guest' }, isNewUser: false };
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const fetchedData = userSnap.data() as Partial<UserData>;
        let dataToUpdate: Partial<UserData> = {};
        
        if (!fetchedData.referralCode) {
            dataToUpdate.referralCode = generateReferralCode();
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
        
        return { userData: finalUserData, isNewUser: false };
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
        await incrementTotalPoints(newUserData.balance);
        const userType = typeof user.id === 'number' ? 'telegram' : 'browser';
        if (userType === 'telegram') await incrementTelegramUserCount(); else await incrementBrowserUserCount();
        
        return { userData: newUserData, isNewUser: true };
    }
};

export const saveUserData = async (user: { id: number | string } | null, data: Partial<Omit<UserData, 'id'>>) => {
    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    
    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
            const oldBalance = userDoc.data().balance || 0;
            const newBalance = data.balance;
            
            if (newBalance !== undefined && oldBalance !== newBalance) {
                const difference = newBalance - oldBalance;
                if (userDoc.data().status === 'active') {
                    await incrementTotalPoints(difference);
                }
            }
            transaction.set(userRef, data, { merge: true });
        } else {
             if (data.balance && data.balance > 0) {
                await incrementTotalPoints(data.balance);
            }
            transaction.set(userRef, data, { merge: true });
        }
    });
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

export const findUserByFaceFingerprint = async (fingerprint: string): Promise<UserData | null> => {
    if (!fingerprint) return null;
    const q = query(collection(db, 'users'), where('faceFingerprint', '==', fingerprint), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { ...defaultUserData(null), ...(userDoc.data() as UserData), id: userDoc.id };
    }
    return null;
};

export const applyReferralBonus = async (newUser: { id: number | string }, referrerCode: string): Promise<UserData | null> => {
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

                const newUserBalance = (newUserDoc.data().balance || 0) + 50;
                transaction.update(newUserRef, { 
                    balance: newUserBalance,
                    referralBonusApplied: true,
                    referredBy: referrerData.id,
                });
            });

            // After transaction, update total points for both users
            await incrementTotalPoints(200 + 50);

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

    // Determine league based on balance
    let league = 'Bronze';
    if (userBalance > 1000000) league = 'Diamond';
    else if (userBalance > 500000) league = 'Platinum';
    else if (userBalance > 100000) league = 'Gold';
    else if (userBalance > 10000) league = 'Silver';

    if (userBalance === 0) {
        const totalUsers = await getTotalUsersCount();
        return { rank: totalUsers, league: 'Unranked' };
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('balance', '>', userBalance));
    
    const snapshot = await getCountFromServer(q);
    const higherRankedCount = snapshot.data().count;

    const rank = higherRankedCount + 1;

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
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;
    const userData = userSnap.data() as UserData;
    
    // If status is not changing, do nothing
    if (userData.status === status) return;

    const dataToUpdate: Partial<UserData> = { status };
    if (status === 'banned') {
        if (reason) dataToUpdate.banReason = reason;
        await decrementTotalPoints(userData.balance); // Subtract from total
    } else if (status === 'active') {
        dataToUpdate.banReason = '';
        await incrementTotalPoints(userData.balance); // Add back to total
    }
    await setDoc(userRef, dataToUpdate, { merge: true });
};

export const updateUserBalance = async (user: {id: string | number }, newBalance: number) => {
    const userDocId = getUserId(user);
    const userRef = doc(db, 'users', userDocId);
    
    if (isNaN(newBalance)) {
        console.error("Invalid balance provided.");
        return;
    }

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const oldBalance = userSnap.data().balance || 0;
    const difference = newBalance - oldBalance;

    await setDoc(userRef, { balance: Number(newBalance) }, { merge: true });
    
    // Only adjust total points if the user is active
    if (userSnap.data().status === 'active') {
        await incrementTotalPoints(difference);
    }
}

export const deleteUser = async (user: {id: string | number}) => {
    const userId = getUserId(user);
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        // If the user was active, subtract their points from the total
        if (userData.status === 'active') {
            await decrementTotalPoints(userData.balance);
        }
        const userType = userId.startsWith('user_') ? 'telegram' : 'browser';
        await decrementUserCount(userType); // Decrement count when a user is deleted
    }

    await deleteDoc(userRef);
};


export const banUser = async (user: {id: number | string} | null, reason?: string) => {
    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        if(userData.status !== 'banned') {
             await decrementTotalPoints(userData.balance);
        }
    }
    
    const dataToSave: Partial<UserData> = { status: 'banned' };
    if (reason) {
        dataToSave.banReason = reason;
    }
    await saveUserData(user, dataToSave);
}

export const forceAddBoosterPack1 = async (user: {id: string | number}) => {
    const userDocId = getUserId(user);
    const userRef = doc(db, 'users', userDocId);
    
    // Atomically add 'boost_1' to the purchasedBoosts array.
    // arrayUnion ensures no duplicates are added.
    await setDoc(userRef, { 
        purchasedBoosts: arrayUnion('boost_1') 
    }, { merge: true });
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

export const incrementTaskCompletionCount = async (taskId: string) => {
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
    let pointsToAdd = 0;
    
    await runTransaction(db, async (transaction) => {
        const telegramUserDoc = await transaction.get(telegramUserRef);
        const browserUserDoc = await transaction.get(browserUserRef);

        if (!browserUserDoc.exists()) {
             throw new Error("Browser user does not exist.");
        }
        
        const telegramData = telegramUserDoc.exists() ? telegramUserDoc.data() as UserData : defaultUserData(telegramUser);
        pointsToAdd = browserUserData.balance || 0;
        const mergedBalance = (telegramData.balance || 0) + pointsToAdd;
       
        transaction.set(telegramUserRef, { 
            balance: mergedBalance,
            walletAddress: browserUserData.walletAddress,
            hasMergedBrowserAccount: true,
        }, { merge: true });
        
        transaction.delete(browserUserRef);
    });
    
    // This function doesn't need to touch total points.
    // The browser user's points were already in the total.
    // We just transfer ownership.
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
    let totalPointsToAdd = 0;

    querySnapshot.forEach((docSnap) => {
        const userRef = doc(db, 'users', docSnap.id);
        const userData = docSnap.data() as UserData;
        batch.update(userRef, { status: 'active', banReason: '' });
        totalPointsToAdd += userData.balance || 0;
    });

    await batch.commit();

    // After unbanning, restore their collective balance to the total points counter
    if (totalPointsToAdd > 0) {
        await incrementTotalPoints(totalPointsToAdd);
    }
    
    return querySnapshot.size;
}

export const claimDailyTapReward = async (userId: string): Promise<{ success: boolean, newBalance?: number }> => {
    const userRef = doc(db, 'users', userId);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        let result: { success: boolean, newBalance?: number } = { success: false };
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error("User not found.");
            }
            const userData = userDoc.data() as UserData;

            if (userData.lastTapDate === today) {
                // Already tapped today, but it's not an error.
                result = { success: false }; // Indicate no change was made
                return;
            }
            
            const REWARD = 100;
            const newBalance = userData.balance + REWARD;

            transaction.update(userRef, {
                balance: newBalance,
                lastTapDate: today
            });
            result = { success: true, newBalance };
        });

        if (result.success) {
            await incrementTotalPoints(100);
        }

        return result;

    } catch (error) {
        console.error("Failed to claim daily tap reward:", error);
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
    
    if (totalReward > 0) {
        await incrementTotalPoints(totalReward);
    }
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
        
        // This transaction just updates the user. The global counter adjustment
        // will be handled separately to avoid transaction complexity.
        await incrementTotalPoints(newExn - oldPoints);
        
        result = { oldBalance: oldPoints, newBalance: newExn };
    });

    return result;
};


// --- Specific Data Functions ---

export const getBalance = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.balance;
export const getMiningEndTime = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.miningEndTime;
export const getDailyStreak = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.dailyStreak;
export const getVerificationStatus = async (user: { id: number | string } | null) => (await getUserData(user as TelegramUser)).userData.verificationStatus;
export const saveVerificationStatus = async (user: { id: number | string } | null, status: UserData['verificationStatus'], imageUri?: string | null, faceFingerprint?: string | null) => {
    const data: Partial<UserData> = { verificationStatus: status };
    if (status === 'verified') {
        if (imageUri) data.faceVerificationUri = imageUri;
        if (faceFingerprint) data.faceFingerprint = faceFingerprint;
    }
    if (user) {
      await saveUserData(user, data);
    }
}
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



    

    


    




