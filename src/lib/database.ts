
'use client';

import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit, runTransaction, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';

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
    balance: number;
    forgingEndTime: number | null;
    dailyStreak: { count: number; lastLogin: string };
    verificationStatus: 'verified' | 'unverified' | 'failed';
    faceVerificationUri: string | null;
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
    };
    status: 'active' | 'banned';
}

const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const getUserId = (telegramUser: TelegramUser | null) => {
    if (!telegramUser) return 'guest'; // Should not happen in a real scenario
    return `user_${telegramUser.id}`;
}

const defaultUserData = (telegramUser: TelegramUser | null): UserData => ({
    balance: 0,
    forgingEndTime: null,
    dailyStreak: { count: 0, lastLogin: '' },
    verificationStatus: 'unverified',
    faceVerificationUri: null,
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
    },
    status: 'active',
});

export const getUserData = async (telegramUser: TelegramUser | null): Promise<UserData> => {
    if (!telegramUser) return defaultUserData(null);
    const userId = getUserId(telegramUser);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const fetchedData = userSnap.data() as Partial<UserData>;
        // Ensure every existing user has a referral code
        if (!fetchedData.referralCode) {
            fetchedData.referralCode = generateReferralCode();
            await setDoc(userRef, { referralCode: fetchedData.referralCode }, { merge: true });
        }
        return { ...defaultUserData(telegramUser), ...fetchedData, telegramUser };
    } else {
        const newUser = {
            ...defaultUserData(telegramUser),
            referralCode: generateReferralCode() // Generate code on creation
        };
        await setDoc(userRef, newUser);
        return newUser;
    }
};

export const saveUserData = async (telegramUser: TelegramUser | null, data: Partial<UserData>) => {
    if (!telegramUser) return;
    const userId = getUserId(telegramUser);
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
};

export const findUserByReferralCode = async (code: string): Promise<UserData | null> => {
    if (!code) return null;
    const q = query(collection(db, 'users'), where('referralCode', '==', code.trim()), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { ...defaultUserData(null), ...(userDoc.data() as UserData) };
    }
    return null;
}

export const findUserByFace = async (faceUri: string): Promise<UserData | null> => {
    if (!faceUri) return null;
    const q = query(collection(db, 'users'), where('faceVerificationUri', '==', faceUri), where('status', '==', 'active'), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        return { ...defaultUserData(null), ...(userDoc.data() as UserData) };
    }
    return null;
}

export const applyReferralBonus = async (newUser: TelegramUser, referrerCode: string): Promise<UserData | null> => {
    const referrer = await findUserByReferralCode(referrerCode);
    if (referrer?.telegramUser) {
        await runTransaction(db, async (transaction) => {
            const referrerRef = doc(db, 'users', getUserId(referrer.telegramUser));
            const newUserRef = doc(db, 'users', getUserId(newUser));

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
                referredBy: referrer.telegramUser?.id.toString() ?? null,
            });
        });

        return await getUserData(newUser);
    }
    return null; // Referrer not found
};

const LEADERBOARD_PAGE_SIZE = 20;

export const getLeaderboardUsers = async (lastVisible: QueryDocumentSnapshot<DocumentData> | null = null): Promise<{ users: UserData[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> => {
    const usersRef = collection(db, 'users');
    let q;
    if (lastVisible) {
        q = query(usersRef, orderBy('balance', 'desc'), startAfter(lastVisible), limit(LEADERBOARD_PAGE_SIZE));
    } else {
        q = query(usersRef, orderBy('balance', 'desc'), limit(LEADERBOARD_PAGE_SIZE));
    }
    
    const querySnapshot = await getDocs(q);
    
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
        users.push({ ...defaultUserData(null), ...(doc.data() as UserData) });
    });
    
    const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

    return { users, lastDoc };
}


export const banUser = async (telegramUser: TelegramUser | null) => {
    if (!telegramUser) return;
    await saveUserData(telegramUser, { status: 'banned' });
}


// --- Specific Data Functions ---

export const getBalance = async (user: TelegramUser | null) => (await getUserData(user)).balance;
export const getForgingEndTime = async (user: TelegramUser | null) => (await getUserData(user)).forgingEndTime;
export const getDailyStreak = async (user: TelegramUser | null) => (await getUserData(user)).dailyStreak;
export const getVerificationStatus = async (user: TelegramUser | null) => (await getUserData(user)).verificationStatus;
export const saveVerificationStatus = async (user: TelegramUser | null, status: 'verified' | 'unverified' | 'failed', imageUri?: string | null) => {
    const data: Partial<UserData> = { verificationStatus: status };
    if (status === 'verified' && imageUri) {
        data.faceVerificationUri = imageUri;
    }
    if (user) {
      await saveUserData(user, data);
    }
}
export const getWalletAddress = async (user: TelegramUser | null) => (await getUserData(user)).walletAddress;
export const saveWalletAddress = async (user: TelegramUser | null, address: string) => saveUserData(user, { walletAddress: address });
export const getReferralCode = async (user: TelegramUser | null) => (await getUserData(user)).referralCode;
export const saveReferralCode = async (user: TelegramUser | null, code: string) => saveUserData(user, { referralCode: code });
