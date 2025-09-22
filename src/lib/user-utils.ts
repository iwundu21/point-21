
import type { UserData } from './database';

export interface TelegramUser {
    id: number | string;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
    is_premium?: boolean;
}

export const getInitials = (user: UserData | TelegramUser | null) => {
    if (!user) return '??';

    const tgUser = 'telegramUser' in user ? user.telegramUser : user;
    
    if (tgUser && tgUser.first_name) {
        const firstNameInitial = tgUser.first_name?.[0] || '';
        const lastNameInitial = tgUser.last_name?.[0] || '';
        return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || '??';
    }
    
    if ('id' in user && typeof user.id === 'string' && user.id.startsWith('browser_')) {
        return 'BU';
    }

    return '??';
};

export const getDisplayName = (user: UserData | TelegramUser | null) => {
    if (!user) return 'Anonymous';
    
    const tgUser = 'telegramUser' in user ? user.telegramUser : user;

    if (tgUser && tgUser.first_name && tgUser.first_name !== 'Browser User') {
        return `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || 'Anonymous';
    }
    return 'Browser User';
};
