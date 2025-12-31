'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Conversation, ConversationProject } from '@/types/chat';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
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

  // Get project data if populated
  const getProjectData = (): ConversationProject | null => {
    if (isProjectConversation && conversation.projectId && typeof conversation.projectId === 'object') {
      return conversation.projectId as ConversationProject;
    }
    return null;
  };

  // Get avatar for display
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
    if (otherUser?.avatar) {
      return (
        <img
          src={otherUser.avatar}
          alt={getDisplayName()}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-400 text-white flex items-center justify-center font-medium">
        {getDisplayName().charAt(0).toUpperCase()}
      </div>
    );
  };

  // Get last message preview
  const getLastMessagePreview = (): string => {
    if (!conversation.lastMessage) return 'No messages yet';

    const msg = conversation.lastMessage;
    if (msg.isDeleted) return 'Message deleted';

    if (msg.type === 'system') {
      return msg.content;
    }

    if (msg.type === 'image') {
      return 'Sent an image';
    }

    if (msg.type === 'file') {
      return 'Sent a file';
    }

    return msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content;
  };

  // Get unread count for current user
  const getUnreadCount = (): number => {
    const receipt = conversation.readReceipts?.find(r => r.userId === currentUser?._id);
    return receipt?.unreadCount || 0;
  };

  const unreadCount = getUnreadCount();

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-dark-400'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">{getAvatar()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium truncate ${
            unreadCount > 0
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {getDisplayName()}
          </span>
          {conversation.lastMessageAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {formatDistanceToNow(new Date(conversation.lastMessageAt), { addSuffix: false })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={`text-sm truncate ${
            unreadCount > 0
              ? 'text-gray-700 dark:text-gray-300 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {getLastMessagePreview()}
          </p>
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary-500 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
