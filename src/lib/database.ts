
'use client';

// THIS IS A MOCK DATABASE USING LOCALSTORAGE.
// In a real application, you would replace this with a proper database like Firebase Firestore.

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
}

const getUserId = (telegramUser: TelegramUser | null) => {
    if (!telegramUser) return 'guest';
    return `user_${telegramUser.id}`;
}

const defaultUserData: Omit<UserData, 'telegramUser'> = {
    balance: 0,
    forgingEndTime: null,
    dailyStreak: { count: 0, lastLogin: '' },
    verificationStatus: 'unverified',
    walletAddress: null,
    referralCode: null,
    referredBy: null,
    referralBonusApplied: false,
    referrals: 0,
    welcomeTasks: {
        followedOnX: false,
        subscribedOnTelegram: false,
        joinedDiscord: false,
    },
};

// In a real app, this would fetch from a remote database.
export const getUserData = (telegramUser: TelegramUser | null): UserData => {
    if (typeof window === 'undefined') return { ...defaultUserData, telegramUser: null };
    const userId = getUserId(telegramUser);
    const data = localStorage.getItem(userId);
    if (data) {
        const parsedData = JSON.parse(data);
        const telegramUserObj = telegramUser ? { id: telegramUser.id, first_name: telegramUser.first_name, last_name: telegramUser.last_name, username: telegramUser.username, language_code: telegramUser.language_code, is_premium: telegramUser.is_premium, photo_url: telegramUser.photo_url } : null;
        // Merge with defaults to ensure new fields are present
        return { ...defaultUserData, ...parsedData, telegramUser: telegramUserObj };
    }
    const telegramUserObj = telegramUser ? { id: telegramUser.id, first_name: telegramUser.first_name, last_name: telegramUser.last_name, username: telegramUser.username, language_code: telegramUser.language_code, is_premium: telegramUser.is_premium, photo_url: telegramUser.photo_url } : null;
    return { ...defaultUserData, telegramUser: telegramUserObj };
};


// In a real app, this would save to a remote database.
export const saveUserData = (telegramUser: TelegramUser | null, data: Partial<UserData>) => {
     if (typeof window === 'undefined' || !telegramUser) return;
    const userId = getUserId(telegramUser);
    const currentData = getUserData(telegramUser);
    const newData = { ...currentData, ...data };
    // We only want to store the data part, not the user object itself in the value.
    const dataToStore = { ...newData };
    delete (dataToStore as any).telegramUser;
    localStorage.setItem(userId, JSON.stringify(dataToStore));
};

// In a real app, this would be a database query.
export const findUserByReferralCode = (code: string): UserData | null => {
    if (typeof window === 'undefined' || !code) return null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsedData: Omit<UserData, 'telegramUser'> = JSON.parse(data);
                    if (parsedData.referralCode && parsedData.referralCode.trim().toLowerCase() === code.trim().toLowerCase()) {
                        const id = parseInt(key.replace('user_', ''), 10);
                        // In a real DB, you'd fetch the full user profile. For localStorage, we need to reconstruct it.
                        // This is a limitation of this mock setup. A real user object would be stored elsewhere.
                        const mockUser: TelegramUser = {
                            id: id,
                            first_name: `User ${id}`, // Placeholder
                            username: `user${id}`,
                             language_code: 'en'
                        }
                        return { ...defaultUserData, ...parsedData, telegramUser: mockUser };
                    }
                }
            } catch (e) {
                console.error("Error parsing user data from localStorage", e);
            }
        }
    }
    return null;
}

// In a real app, this would be a transactional update in a database.
export const applyReferralBonus = (newUser: TelegramUser, referrerCode: string): UserData | null => {
    if (typeof window === 'undefined') return null;

    const referrer = findUserByReferralCode(referrerCode);
    if (referrer?.telegramUser) {
        const referrerData = getUserData(referrer.telegramUser);
        const newReferrerData = {
            ...referrerData,
            balance: referrerData.balance + 200,
            referrals: (referrerData.referrals || 0) + 1,
        };
        saveUserData(referrer.telegramUser, newReferrerData);
    }
    
    const newUserData = getUserData(newUser);
    const updatedNewUserData = {
        ...newUserData,
        balance: newUserData.balance + 50,
        referralBonusApplied: true,
        referredBy: referrer?.telegramUser?.id.toString() ?? null,
    };
    saveUserData(newUser, updatedNewUserData);

    return updatedNewUserData;
};


// --- Specific Data Functions ---

export const getBalance = (user: TelegramUser | null) => getUserData(user).balance;
export const saveBalance = (user: TelegramUser | null, balance: number) => saveUserData(user, { balance });

export const getForgingEndTime = (user: TelegramUser | null) => getUserData(user).forgingEndTime;
export const saveForgingEndTime = (user: TelegramUser | null, endTime: number | null) => saveUserData(user, { forgingEndTime: endTime });

export const getDailyStreak = (user: TelegramUser | null) => getUserData(user).dailyStreak;
export const saveDailyStreak = (user: TelegramUser | null, streak: { count: number, lastLogin: string }) => saveUserData(user, { dailyStreak: streak });

export const getVerificationStatus = (user: TelegramUser | null) => getUserData(user).verificationStatus;
export const saveVerificationStatus = (user: TelegramUser | null, status: 'verified' | 'unverified' | 'failed') => saveUserData(user, { verificationStatus: status });

export const getWalletAddress = (user: TelegramUser | null) => getUserData(user).walletAddress;
export const saveWalletAddress = (user: TelegramUser | null, address: string) => saveUserData(user, { walletAddress: address });

export const getReferralCode = (user: TelegramUser | null) => getUserData(user).referralCode;
export const saveReferralCode = (user: TelegramUser | null, code: string) => saveUserData(user, { referralCode: code });
