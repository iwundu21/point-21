

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

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

export interface SocialTask {
    id: string; // Document ID from Firestore
    title: string;
    description: string;
    points: number;
    link: string;
    icon: string; // Storing icon name as string e.g., "MessageCircle"
    createdAt: any; // Firestore timestamp
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

const getUserId = (telegramUser: TelegramUser | null) => {
    if (!telegramUser) return 'guest'; // Should not happen in a real scenario
    return `user_${telegramUser.id}`;
}

const defaultUserData = (telegramUser: TelegramUser | null): Omit<UserData, 'id'> => ({
    balance: 0,
    forgingEndTime: null,
    dailyStreak: { count: 0, lastLogin: '' },
    verificationStatus: 'unverified',
    faceVerificationUri: null,
    faceFingerprint: null,
    walletAddress: null,
    telegramUser: telegramUser,
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

export const getUserData = async (telegramUser: TelegramUser | null): Promise<UserData> => {
    if (!telegramUser) return { ...defaultUserData(null), id: 'guest' };
    const userId = getUserId(telegramUser);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const fetchedData = userSnap.data() as Partial<Omit<UserData, 'id'>>;
        // Ensure every existing user has a referral code
        if (!fetchedData.referralCode) {
            fetchedData.referralCode = generateReferralCode();
            await setDoc(userRef, { referralCode: fetchedData.referralCode }, { merge: true });
        }
        return { ...defaultUserData(telegramUser), ...fetchedData, telegramUser, id: userSnap.id };
    } else {
        const newUser: Omit<UserData, 'id'> = {
            ...defaultUserData(telegramUser),
            referralCode: generateReferralCode(), // Generate code on creation
        };
        await setDoc(userRef, newUser);
        return { ...newUser, id: userId };
    }
};

export const saveUserData = async (telegramUser: TelegramUser | null, data: Partial<Omit<UserData, 'id'>>) => {
    if (!telegramUser) return;
    const userId = getUserId(telegramUser);
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

export const applyReferralBonus = async (newUser: TelegramUser, referrerCode: string): Promise<UserData | null> => {
    const referrerData = await findUserByReferralCode(referrerCode);
    if (referrerData?.telegramUser) {
        try {
            await runTransaction(db, async (transaction) => {
                const referrerRef = doc(db, 'users', getUserId(referrerData.telegramUser!));
                const newUserRef = doc(db, 'users', getUserId(newUser));

                // Get the latest data within the transaction
                const referrerDoc = await transaction.get(referrerRef);
                const newUserDoc = await transaction.get(newUserRef);

                if (!referrerDoc.exists() || !newUserDoc.exists()) {
                    throw "Documents do not exist!";
                }
                
                // Award referrer
                const newReferrerBalance = (referrerDoc.data().balance || 0) + 200;
                const newReferralsCount = (referrerDoc.data().referrals || 0) + 1;
                transaction.update(referrerRef, { balance: newReferrerBalance, referrals: newReferralsCount });

                // Award new user
                const newUserBalance = (newUserDoc.data().balance || 0) + 50;
                transaction.update(newUserRef, { 
                    balance: newUserBalance,
                    referralBonusApplied: true,
                    referredBy: referrerData.telegramUser?.id.toString() ?? null,
                });
            });
            // Return the updated data for the current user
            return await getUserData(newUser);
        } catch (error) {
            console.error("Transaction failed: ", error);
            return null;
        }
    }
    return null; // Referrer not found
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

export const getAllUsers = async (): Promise<{ users: UserData[] }> => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('balance', 'desc'));
    
    const querySnapshot = await getDocs(q);
    
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
        users.push({ ...defaultUserData(null), ...(doc.data() as Omit<UserData, 'id'>), id: doc.id });
    });
    
    return { users };
};


export const updateUserStatus = async (telegramUser: TelegramUser, status: 'active' | 'banned', reason?: string) => {
    const userId = getUserId(telegramUser);
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    const dataToUpdate: Partial<UserData> = { status };
    if (status === 'banned' && reason) {
        dataToUpdate.banReason = reason;
    } else if (status === 'active') {
        // When unbanning, clear the reason
        dataToUpdate.banReason = '';
    }
    await setDoc(userRef, dataToUpdate, { merge: true });
};

export const updateUserBalance = async (telegramUser: TelegramUser, newBalance: number) => {
    const userId = getUserId(telegramUser);
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    // Ensure balance is a valid number
    if (isNaN(newBalance)) {
        console.error("Invalid balance provided.");
        return;
    }
    await setDoc(userRef, { balance: Number(newBalance) }, { merge: true });
}

export const deleteUser = async (telegramUser: TelegramUser) => {
    const userId = getUserId(telegramUser);
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
};


export const banUser = async (telegramUser: TelegramUser | null, reason?: string) => {
    if (!telegramUser) return;
    const dataToSave: Partial<UserData> = { status: 'banned' };
    if (reason) {
        dataToSave.banReason = reason;
    }
    await saveUserData(telegramUser, dataToSave);
}


// --- Social Task Admin Functions ---
export const addSocialTask = async (task: Omit<SocialTask, 'id' | 'createdAt'>) => {
    const tasksCollection = collection(db, 'socialTasks');
    await addDoc(tasksCollection, {
        ...task,
        createdAt: serverTimestamp()
    });
};

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

export const getBalance = async (user: TelegramUser | null) => (await getUserData(user)).balance;
export const getForgingEndTime = async (user: TelegramUser | null) => (await getUserData(user)).forgingEndTime;
export const getDailyStreak = async (user: TelegramUser | null) => (await getUserData(user)).dailyStreak;
export const getVerificationStatus = async (user: TelegramUser | null) => (await getUserData(user)).verificationStatus;
export const saveVerificationStatus = async (user: TelegramUser | null, status: 'verified' | 'unverified' | 'failed', imageUri?: string | null, faceFingerprint?: string | null) => {
    const data: Partial<UserData> = { verificationStatus: status };
    if (status === 'verified') {
        if (imageUri) data.faceVerificationUri = imageUri;
        if (faceFingerprint) data.faceFingerprint = faceFingerprint;
    }
    if (user) {
      await saveUserData(user, data);
    }
}
export const getWalletAddress = async (user: TelegramUser | null) => (await getUserData(user)).walletAddress;
export const saveWalletAddress = async (user: TelegramUser | null, address: string) => saveUserData(user, { walletAddress: address });
export const getReferralCode = async (user: TelegramUser | null) => (await getUserData(user)).referralCode;
export const saveReferralCode = async (user: TelegramUser | null, code: string) => saveUserData(user, { referralCode: code });
