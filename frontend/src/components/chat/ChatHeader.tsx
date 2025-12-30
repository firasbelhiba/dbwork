'use client';

import React from 'react';
import { Conversation } from '@/types/chat';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/common/UserAvatar';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  showBackButton?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  showBackButton = false,
}) => {
  const { user: currentUser } = useAuth();

  // Helper to check conversation type (handles both enum and string from API)
  const isDirectConversation = conversation.type === 'direct';
  const isProjectConversation = conversation.type === 'project';

  // Get the other user in a DM conversation
  const getOtherUser = (): User | null => {
    if (!isDirectConversation) return null;
    const other = conversation.participants.find(p => p._id !== currentUser?._id);
    // Ensure we have a populated user object, not just an ID
    if (other && typeof other === 'object' && other.firstName) {
      return other;
    }
    return null;
  };

  // Get conversation display name
  const getDisplayName = (): string => {
    if (isProjectConversation) {
      return conversation.name || 'Project Chat';
    }
    const otherUser = getOtherUser();
    if (otherUser && otherUser.firstName) {
      return `${otherUser.firstName} ${otherUser.lastName || ''}`.trim();
    }
    return 'Unknown User';
  };

  // Get avatar with online status
  const getAvatar = () => {
    if (isProjectConversation) {
      return (
        <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center font-medium">
          {(conversation.name || 'P').charAt(0).toUpperCase()}
        </div>
      );
    }
    const otherUser = getOtherUser();
    if (otherUser) {
      return (
        <UserAvatar
          userId={otherUser._id}
          avatar={otherUser.avatar}
          firstName={otherUser.firstName}
          lastName={otherUser.lastName}
          size="lg"
          showOnlineStatus={true}
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-400 text-white flex items-center justify-center font-medium">
        {getDisplayName().charAt(0).toUpperCase()}
      </div>
    );
  };

  // Get subtitle
  const getSubtitle = (): string => {
    if (isProjectConversation) {
      return `${conversation.participants.length} members`;
    }
    const otherUser = getOtherUser();
    return otherUser?.email || '';
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-dark-400">
      {/* Back button */}
      {showBackButton && onBack && (
        <button
          onClick={onBack}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Avatar */}
      <div className="flex-shrink-0">{getAvatar()}</div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 dark:text-white truncate">
          {getDisplayName()}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {getSubtitle()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search in conversation */}
        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
          title="Search in conversation"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* More options */}
        <button
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
          title="More options"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
