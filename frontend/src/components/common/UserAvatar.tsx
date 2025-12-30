'use client';

import React from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { getInitials } from '@/lib/utils';

interface UserAvatarProps {
  userId?: string;
  avatar?: string | null;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showOnlineStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
  '2xl': 'w-24 h-24 text-3xl',
};

const dotSizeClasses = {
  xs: 'w-1.5 h-1.5 border',
  sm: 'w-2 h-2 border',
  md: 'w-2.5 h-2.5 border-2',
  lg: 'w-3 h-3 border-2',
  xl: 'w-3.5 h-3.5 border-2',
  '2xl': 'w-4 h-4 border-2',
};

const dotPositionClasses = {
  xs: 'bottom-0 right-0',
  sm: 'bottom-0 right-0',
  md: 'bottom-0 right-0',
  lg: 'bottom-0 right-0',
  xl: 'bottom-0 right-0',
  '2xl': 'bottom-1 right-1',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  avatar,
  firstName = '',
  lastName = '',
  size = 'md',
  showOnlineStatus = true,
  className = '',
}) => {
  const { onlineUserIds } = useWebSocket();

  const isOnline = userId ? onlineUserIds.includes(userId) : false;
  const initials = getInitials(firstName, lastName);
  const fullName = `${firstName} ${lastName}`.trim() || 'User';

  return (
    <div className={`relative inline-flex ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={fullName}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-primary-500 text-white flex items-center justify-center font-bold shadow-sm`}
        >
          {initials}
        </div>
      )}

      {/* Online/Offline indicator dot */}
      {showOnlineStatus && (
        <span
          className={`absolute ${dotPositionClasses[size]} ${dotSizeClasses[size]} ${
            isOnline ? 'bg-green-500' : 'bg-red-500'
          } border-white dark:border-dark-500 rounded-full`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
};

// Variant without online status check (for use in lists where we pass isOnline directly)
interface UserAvatarWithStatusProps extends Omit<UserAvatarProps, 'showOnlineStatus'> {
  isOnline?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const UserAvatarWithStatus: React.FC<UserAvatarWithStatusProps> = ({
  userId,
  avatar,
  firstName = '',
  lastName = '',
  size = 'md',
  isOnline = false,
  className = '',
}) => {
  const initials = getInitials(firstName, lastName);
  const fullName = `${firstName} ${lastName}`.trim() || 'User';

  return (
    <div className={`relative inline-flex ${className}`}>
      {avatar ? (
        <img
          src={avatar}
          alt={fullName}
          className={`${sizeClasses[size]} rounded-full object-cover shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-primary-500 text-white flex items-center justify-center font-bold shadow-sm`}
        >
          {initials}
        </div>
      )}

      {/* Online/Offline indicator dot */}
      <span
        className={`absolute ${dotPositionClasses[size]} ${dotSizeClasses[size]} ${
          isOnline ? 'bg-green-500' : 'bg-red-500'
        } border-white dark:border-dark-500 rounded-full`}
        title={isOnline ? 'Online' : 'Offline'}
      />
    </div>
  );
};

export default UserAvatar;
