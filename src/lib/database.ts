
import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, addDoc, serverTimestamp, increment } from 'firebase/firestore';

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
    forgingEndTime: number | null;
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
    forgingEndTime: null,
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
});

// --- User Count Management ---
const statsRef = doc(db, 'app-stats', 'user-counter');

const incrementUserCount = async () => {
    await setDoc(statsRef, { count: increment(1) }, { merge: true });
};

const decrementUserCount = async () => {
    await setDoc(statsRef, { count: increment(-1) }, { merge: true });
};

export const getTotalUsersCount = async (): Promise<number> => {
    const statsSnap = await getDoc(statsRef);
    if (statsSnap.exists()) {
        return statsSnap.data().count || 0;
    }
    return 0;
};

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


export const getUserData = async (user: { id: number | string } | null): Promise<UserData> => {
    if (!user) return { ...defaultUserData(null), id: 'guest' };
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
        
        return finalUserData;
    } else {
        const newUser: Omit<UserData, 'id'> = {
            ...defaultUserData(user),
            referralCode: generateReferralCode(), // Generate code on creation
        };
        await setDoc(userRef, newUser);
        await incrementUserCount(); // Increment count for new user
        // New users start with 0 points, so no need to increment total points here.
        return { ...newUser, id: userId };
    }
};

export const saveUserData = async (user: { id: number | string } | null, data: Partial<Omit<UserData, 'id'>>) => {
    if (!user) return;
    const userId = getUserId(user);
    const userRef = doc(db, 'users', userId);
    const oldSnap = await getDoc(userRef);
    const oldData = oldSnap.exists() ? oldSnap.data() as UserData : defaultUserData(user);

    await setDoc(userRef, data, { merge: true });

    // If balance was updated, adjust total points
    if (data.balance !== undefined && data.balance !== oldData.balance) {
         if (oldData.status === 'active') { // Only adjust if the user is active
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

            return await getUserData(newUser);
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

// --- Admin Functions ---

export const getAllUsers = async (lastVisible?: QueryDocumentSnapshot<DocumentData>, pageSize: number = 50): Promise<{ users: UserData[], lastVisible: QueryDocumentSnapshot<DocumentData> | null }> => {
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
    const userId = user.id;
    if (!userId) return;
    const userDocId = typeof userId === 'number' ? `user_${userId}` : userId;
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
    const userId = user.id;
    if (!userId) return;
    const userDocId = typeof userId === 'number' ? `user_${userId}` : userId;
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
    const userId = user.id;
    if (!userId) return;
    const userDocId = typeof userId === 'number' ? `user_${userId}` : userId;
    const userRef = doc(db, 'users', userDocId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        // If the user was active, subtract their points from the total
        if (userData.status === 'active') {
            await decrementTotalPoints(userData.balance);
        }
    }

    await deleteDoc(userRef);
    await decrementUserCount(); // Decrement count when a user is deleted
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
export const addSocialTask = async (task: Omit<SocialTask, 'id' | 'createdAt'>) => {
    const tasksCollection = collection(db, 'socialTasks');
    await addDoc(tasksCollection, {
        ...task,
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


// --- Specific Data Functions ---

export const getBalance = async (user: { id: number | string } | null) => (await getUserData(user)).balance;
export const getForgingEndTime = async (user: { id: number | string } | null) => (await getUserData(user)).forgingEndTime;
export const getDailyStreak = async (user: { id: number | string } | null) => (await getUserData(user)).dailyStreak;
export const getVerificationStatus = async (user: { id: number | string } | null) => (await getUserData(user)).verificationStatus;
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
export const getWalletAddress = async (user: { id: number | string } | null) => (await getUserData(user)).walletAddress;
export const saveWalletAddress = async (user: { id: number | string } | null, address: string) => saveUserData(user, { walletAddress: address });
export const getReferralCode = async (user: { id: number | string } | null) => (await getUserData(user)).referralCode;
export const saveReferralCode = async (user: { id: number | string } | null, code: string) => saveUserData(user, { referralCode: code });
export const saveUserPhotoUrl = async (user: { id: number | string } | null, photoUrl: string) => saveUserData(user, { customPhotoUrl: photoUrl });
