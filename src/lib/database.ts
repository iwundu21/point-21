
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

const initializeMockUsers = () => {
    if (typeof window === 'undefined') return;

    // Check if any user data already exists to avoid overwriting real data.
    const hasUsers = [...Array(localStorage.length).keys()].some(i => localStorage.key(i)?.startsWith('user_'));
    if (hasUsers) {
        return;
    }

    const mockUsers: TelegramUser[] = [
        { id: 1, first_name: 'Alice', last_name: 'Wonder', username: 'alice', language_code: 'en', photo_url: 'https://placehold.co/128x128/EEDC82/000000?text=A' },
        { id: 2, first_name: 'Bob', last_name: 'Builder', username: 'bob', language_code: 'en', photo_url: 'https://placehold.co/128x128/90EE90/000000?text=B' },
        { id: 3, first_name: 'Charlie', last_name: 'Chocolate', username: 'charlie', language_code: 'en', photo_url: 'https://placehold.co/128x128/ADD8E6/000000?text=C' },
        { id: 4, first_name: 'Diana', last_name: 'Prince', username: 'diana', language_code: 'en', photo_url: 'https://placehold.co/128x128/FFB6C1/000000?text=D' },
        { id: 5, first_name: 'Ethan', last_name: 'Hunt', username: 'ethan', language_code: 'en', photo_url: 'https://placehold.co/128x128/DDA0DD/000000?text=E' },
        { id: 6, first_name: 'Fiona', last_name: 'Shrek', username: 'fiona', language_code: 'en', photo_url: 'https://placehold.co/128x128/8FBC8F/000000?text=F' },
        { id: 7, first_name: 'George', last_name: 'Jungle', username: 'george', language_code: 'en', photo_url: 'https://placehold.co/128x128/F4A460/000000?text=G' },
        { id: 8, first_name: 'Hannah', last_name: 'Montana', username: 'hannah', language_code: 'en', photo_url: 'https://placehold.co/128x128/B0E0E6/000000?text=H' },
        { id: 9, first_name: 'Ian', last_name: 'Fleming', username: 'ian', language_code: 'en', photo_url: 'https://placehold.co/128x128/778899/FFFFFF?text=I' },
        { id: 10, first_name: 'Jane', last_name: 'Doe', username: 'jane', language_code: 'en', photo_url: 'https://placehold.co/128x128/FFC0CB/000000?text=J' },
        { id: 11, first_name: 'Current', last_name: 'User', username: 'devuser', language_code: 'en', photo_url: 'https://placehold.co/128x128/E6E6FA/000000?text=CU' },
    ];

    mockUsers.forEach((user, index) => {
        saveUserData(user, {
            balance: 100000 - (index * 5000) - Math.floor(Math.random() * 5000),
            telegramUser: user
        });
    });
};


// In a real app, this would fetch from a remote database.
export const getUserData = (telegramUser: TelegramUser | null): UserData => {
    if (typeof window === 'undefined') return { ...defaultUserData, telegramUser: null };
    initializeMockUsers(); // Development only: ensures some data exists
    const userId = getUserId(telegramUser);
    const data = localStorage.getItem(userId);
    if (data) {
        const parsedData = JSON.parse(data);
        const telegramUserObj = telegramUser ? { ...telegramUser } : (parsedData.telegramUser || null);
        return { ...defaultUserData, ...parsedData, telegramUser: telegramUserObj };
    }
    const telegramUserObj = telegramUser ? { ...telegramUser } : null;
    return { ...defaultUserData, telegramUser: telegramUserObj };
};

// In a real app, this would save to a remote database.
export const saveUserData = (telegramUser: TelegramUser | null, data: Partial<UserData>) => {
     if (typeof window === 'undefined' || !telegramUser) return;
    const userId = getUserId(telegramUser);
    const currentData = getUserData(telegramUser);
    const newData = { ...currentData, ...data, telegramUser };
    localStorage.setItem(userId, JSON.stringify(newData));
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
                    const parsedData: UserData = JSON.parse(data);
                    if (parsedData.referralCode && parsedData.referralCode.trim().toLowerCase() === code.trim().toLowerCase()) {
                        return { ...defaultUserData, ...parsedData };
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

// In a real app, this would be a database query that returns all users.
export const getAllUsers = (): UserData[] => {
    if (typeof window === 'undefined') return [];
    const users: UserData[] = [];
     for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsedData: UserData = JSON.parse(data);
                     if(parsedData.telegramUser) {
                        users.push({ ...defaultUserData, ...parsedData });
                    }
                }
            } catch (e) {
                console.error("Error parsing user data from localStorage", e);
            }
        }
    }
    return users;
}


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

    