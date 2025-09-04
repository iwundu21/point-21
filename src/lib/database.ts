

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, addDoc, serverTimestamp, increment,getCountFromServer, writeBatch } from 'firebase/firestore';

// THIS IS NOW A REAL DATABASE USING FIRESTORE.

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code: string;
    is_premium?: boolean;
    photo_url?: string;
}

export interface UserData {
    id: string; // Document ID
    balance: number;
    miningEndTime: number | null;
    miningRate: number; // Daily mining points
    dailyStreak: { count: number; lastLogin: string };
    verificationStatus: 'verified' | 'unverified' | 'failed';
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
}

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const getUserId = (user: { id: number | string } | null): string => {
    if (!user) return 'guest';
    // Prefix to distinguish between ID types
    return typeof user.id === 'number' ? `user_${user.id}` : `browser_${user.id}`;
};

const defaultUserData = (user: { id: number | string, first_name?: string } | null): Omit<UserData, 'id'> => ({
    balance: 0,
    miningEndTime: null,
    miningRate: user && typeof user.id === 'number' ? 1000 : 700,
    dailyStreak: { count: 0, lastLogin: '' },
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
    socialTasks: {
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
});

// --- User Count Management ---
const statsRef = doc(db, 'app-stats', 'user-counter');
const telegramUsersStatsRef = doc(db, 'app-stats', 'telegram-user-counter');
const browserUsersStatsRef = doc(db, 'app-stats', 'browser-user-counter');


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

const incrementUserCount = async (userType: 'telegram' | 'browser') => {
    await setDoc(statsRef, { count: increment(1) }, { merge: true });
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
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
        return statsSnap.data().count || 0;
    }
    return 0;
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

const incrementTotalPoints = async (amount: number) => {
    if (isNaN(amount)) return;
    await setDoc(pointsStatsRef, { total: increment(amount) }, { merge: true });
}

const decrementTotalPoints = async (amount: number) => {
    if (isNaN(amount)) return;
    await setDoc(pointsStatsRef, { total: increment(-amount) }, { merge: true });
}

export const getTotalActivePoints = async (): Promise<number> => {
    const pointsSnap = await getDoc(pointsStatsRef);
    if (pointsSnap.exists()) {
        return pointsSnap.data().total || 0;
    }
    return 0;
};


export const getUserData = async (user: { id: number | string } | null): Promise<{ userData: UserData, isNewUser: boolean }> => {
    if (!user) return { userData: { ...defaultUserData(null), id: 'guest' }, isNewUser: false };
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const fetchedData = userSnap.data() as Partial<Omit<UserData, 'id'>>;
        let shouldSave = false;
        if (!fetchedData.referralCode) {
            fetchedData.referralCode = generateReferralCode();
            shouldSave = true;
        }

        const finalUserData = { ...defaultUserData(user), ...fetchedData, id: userSnap.id };
        if (typeof user.id === 'number') {
            finalUserData.telegramUser = user as TelegramUser;
        }

        if (shouldSave) {
            await setDoc(userRef, { referralCode: finalUserData.referralCode }, { merge: true });
        }
        
        return { userData: finalUserData, isNewUser: false };
    } else {
        // For Telegram users, we create the user on first load.
        // For Browser users, we wait until they save their wallet.
        const isTelegramUser = typeof user.id === 'number';
        if (isTelegramUser) {
            const newUser: Omit<UserData, 'id'> = {
                ...defaultUserData(user),
                referralCode: generateReferralCode(),
            };
            await setDoc(userRef, newUser);
            await incrementUserCount('telegram');
            return { userData: { ...newUser, id: userId }, isNewUser: true };
        } else {
            // Return default data for a new browser user without saving to DB.
            return { userData: { ...defaultUserData(user), id: userId }, isNewUser: true };
        }
    }
};

export const saveUserData = async (user: { id: number | string } | null, data: Partial<Omit<UserData, 'id'>>) => {
    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    
    // Check if the user exists before trying to get old data
    const oldSnap = await getDoc(userRef);
    const oldData = oldSnap.exists() ? oldSnap.data() as UserData : defaultUserData(user);

    await setDoc(userRef, data, { merge: true });

    // If balance was updated, adjust total points
    if (data.balance !== undefined && data.balance !== oldData.balance) {
         if (oldData.status === 'active' || (oldSnap.exists() && oldSnap.data().status === 'active')) { // Check both old state and DB state
            const difference = data.balance - oldData.balance;
            await incrementTotalPoints(difference);
        }
    }
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
}

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
            await incrementTotalPoints(200); // For referrer
            await incrementTotalPoints(50); // For new user

            const { userData } = await getUserData(newUser);
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
    querySnapshot.forEach((doc) => {
        users.push({ ...defaultUserData(null), ...(doc.data() as Omit<UserData, 'id'>), id: doc.id });
    });

    return { users };
}

export const getUserRank = async (user: { id: number | string } | null): Promise<{ rank: number; league: string }> => {
    if (!user) return { rank: 0, league: 'Unranked' };

    const { userData: currentUserData } = await getUserData(user);
    if (!currentUserData) {
        return { rank: 0, league: 'Unranked' };
    }

    const userBalance = currentUserData.balance;

    if (userBalance === 0) {
        const totalUsers = await getTotalUsersCount();
        return { rank: totalUsers, league: 'Unranked' };
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('balance', '>', userBalance));
    
    const snapshot = await getCountFromServer(q);
    const higherRankedCount = snapshot.data().count;

    const rank = higherRankedCount + 1;

    let league = 'Bronze';
    if (rank <= 10) league = 'Diamond';
    else if (rank <= 100) league = 'Platinum';
    else if (rank <= 1000) league = 'Gold';
    else if (rank <= 10000) league = 'Silver';
    
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
    const { userData: telegramData } = await getUserData(telegramUser);

    // Prepare merged data
    const mergedData: Partial<UserData> = {
        balance: (telegramData.balance || 0) + (browserUserData.balance || 0),
        referrals: (telegramData.referrals || 0) + (browserUserData.referrals || 0),
        referredBy: telegramData.referredBy || browserUserData.referredBy,
        referralBonusApplied: telegramData.referralBonusApplied || browserUserData.referralBonusApplied,
        hasMergedBrowserAccount: true, // Mark as merged
    };
    
    // Save merged data to Telegram user
    await setDoc(telegramUserRef, mergedData, { merge: true });
    
    // Delete the old browser user
    await deleteUser({ id: browserUserData.id.replace('browser_', '') });
    
    // Return the updated telegram user data
    const { userData } = await getUserData(telegramUser);
    return userData;
}


// --- Specific Data Functions ---

export const getBalance = async (user: { id: number | string } | null) => (await getUserData(user)).userData.balance;
export const getMiningEndTime = async (user: { id: number | string } | null) => (await getUserData(user)).userData.miningEndTime;
export const getDailyStreak = async (user: { id: number | string } | null) => (await getUserData(user)).userData.dailyStreak;
export const getVerificationStatus = async (user: { id: number | string } | null) => (await getUserData(user)).userData.verificationStatus;
export const saveVerificationStatus = async (user: { id: number | string } | null, status: 'verified' | 'unverified' | 'failed', imageUri?: string | null, faceFingerprint?: string | null) => {
    const data: Partial<UserData> = { verificationStatus: status };
    if (status === 'verified') {
        if (imageUri) data.faceVerificationUri = imageUri;
        if (faceFingerprint) data.faceFingerprint = faceFingerprint;
    }
    if (user) {
      await saveUserData(user, data);
    }
}
export const getWalletAddress = async (user: { id: number | string } | null) => (await getUserData(user)).userData.walletAddress;
export const saveWalletAddress = async (user: { id: number | string } | null, address: string) => {
    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // This is a new browser user, create their record now.
        const newUser: Omit<UserData, 'id'> = {
            ...defaultUserData(user),
            referralCode: generateReferralCode(),
            walletAddress: address,
        };
        await setDoc(userRef, newUser);
        await incrementUserCount('browser');
    } else {
        // This is an existing user (Telegram or Browser) just updating their wallet.
        await setDoc(userRef, { walletAddress: address }, { merge: true });
    }
}

export const getReferralCode = async (user: { id: number | string } | null) => (await getUserData(user)).userData.referralCode;
export const saveReferralCode = async (user: { id: number | string } | null, code: string) => saveUserData(user, { referralCode: code });
export const saveUserPhotoUrl = async (user: { id: number | string } | null, photoUrl: string) => saveUserData(user, { customPhotoUrl: photoUrl });
    
    
    

    











