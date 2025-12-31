'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Conversation, ConversationProject } from '@/types/chat';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/common/UserAvatar';

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  showBackButton?: boolean;
  onSearch?: (query: string) => void;
  onClearSearch?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onBack,
  showBackButton = false,
  onSearch,
  onClearSearch,
}) => {
  const { user: currentUser } = useAuth();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when search opens
  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch?.(query);
  };

  // Handle close search
  const handleCloseSearch = () => {
    setShowSearchInput(false);
    setSearchQuery('');
    onClearSearch?.();
  };

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

  // Get project data if populated
  const getProjectData = (): ConversationProject | null => {
    if (isProjectConversation && conversation.projectId && typeof conversation.projectId === 'object') {
      return conversation.projectId as ConversationProject;
    }
    return null;
  };

  // Get avatar with online status
  const getAvatar = () => {
    if (isProjectConversation) {
      const project = getProjectData();
      if (project?.logo) {
        return (
          <img
            src={project.logo}
            alt={conversation.name || 'Project'}
            className="w-10 h-10 rounded-full object-cover"
          />
        );
      }
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
    <div className="border-b border-gray-200 dark:border-dark-400">
      {/* Main header row */}
      <div className="flex items-center gap-3 px-4 py-3">
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
            onClick={() => setShowSearchInput(!showSearchInput)}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors ${
              showSearchInput ? 'bg-gray-100 dark:bg-dark-400' : ''
            }`}
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

      {/* Search input row */}
      {showSearchInput && (
        <div className="px-4 pb-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search in this conversation..."
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-gray-100 dark:bg-dark-400 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={handleCloseSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-full transition-colors"
              >
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
