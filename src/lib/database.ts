
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
    onboardingCompleted: boolean;
}

const getUserId = (telegramUser: TelegramUser | null) => {
    if (!telegramUser) return 'guest';
    return `user_${telegramUser.id}`;
}

const defaultUserData: UserData = {
    balance: 0,
    forgingEndTime: null,
    dailyStreak: { count: 0, lastLogin: '' },
    verificationStatus: 'unverified',
    walletAddress: null,
    telegramUser: null,
    referralCode: null,
    referredBy: null,
    referralBonusApplied: false,
    referrals: 0,
    onboardingCompleted: false,
};

// In a real app, this would fetch from a remote database.
export const getUserData = (telegramUser: TelegramUser | null): UserData => {
    if (typeof window === 'undefined') return defaultUserData;
    const userId = getUserId(telegramUser);
    const data = localStorage.getItem(userId);
    if (data) {
        const parsedData = JSON.parse(data);
        // Ensure all default fields are present
        return { ...defaultUserData, ...parsedData, telegramUser };
    }
    return { ...defaultUserData, telegramUser };
};

// In a real app, this would save to a remote database.
export const saveUserData = (telegramUser: TelegramUser | null, data: Partial<Omit<UserData, 'telegramUser'>>) => {
     if (typeof window === 'undefined') return;
    const userId = getUserId(telegramUser);
    const currentData = getUserData(telegramUser);
    const newData = { ...currentData, ...data };
    delete (newData as any).telegramUser; // Don't store user object in the data blob
    localStorage.setItem(userId, JSON.stringify(newData));
};

// In a real app, this would be a database query.
export const findUserByReferralCode = (code: string): UserData | null => {
    if (typeof window === 'undefined') return null;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
            const data = localStorage.getItem(key);
            if (data) {
                const userData: UserData = JSON.parse(data);
                if (userData.referralCode === code) {
                    // Re-create the telegramUser object from the key
                    const id = parseInt(key.replace('user_', ''));
                    return { ...userData, telegramUser: { id } as TelegramUser };
                }
            }
        }
    }
    return null;
}

// In a real app, this would be a transactional update in a database.
export const applyReferralBonus = (referrerCode: string) => {
    if (typeof window === 'undefined') return;
    const referrerData = findUserByReferralCode(referrerCode);
    if (referrerData && referrerData.telegramUser) {
        const newBalance = (referrerData.balance || 0) + 200;
        const newReferrals = (referrerData.referrals || 0) + 1;
        saveUserData(referrerData.telegramUser, { balance: newBalance, referrals: newReferrals });
    }
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
