
'use client';

import type { FC } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from './ui/skeleton';
import type { UserData } from '@/lib/database';


interface User {
    id: number | string;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    photo_url?: string;
}

interface UserCardProps {
  user: User | null;
  userData?: UserData | null;
}

const UserCard: FC<UserCardProps> = ({ user, userData }) => {
  if (!user) {
    return (
      <div className="w-full p-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    const firstNameInitial = user.first_name ? user.first_name[0] : '';
    const lastNameInitial = user.last_name ? user.last_name[0] : '';
    return `${firstNameInitial}${lastNameInitial}`.toUpperCase() || '??';
  }

  const displayName = user.first_name && user.first_name !== 'Browser User' 
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : 'Browser User';
    
  const avatarSrc = userData?.customPhotoUrl || user.photo_url;

  return (
    <div className="w-full">
      <div className="flex items-center space-x-4">
        <Avatar className="w-12 h-12">
            <AvatarImage src={avatarSrc} alt={displayName} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-lg">{displayName}</span>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
