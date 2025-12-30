'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Conversation } from '@/types/chat';
import { chatAPI } from '@/lib/api';
import { ConversationList } from './ConversationList';
import { ChatHeader } from './ChatHeader';
import { MessageThread } from './MessageThread';
import { NewConversationModal } from './NewConversationModal';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [conversationId: string]: string[] }>({});

  const { user } = useAuth();
  const { onChatMessage } = useWebSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count from API (only on mount)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await chatAPI.getUnreadCount();
      const count = response.data.count || 0;
      setUnreadCount(count);
      onUnreadCountChange?.(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [onUnreadCountChange]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count on mount only
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Listen for new messages via WebSocket to update unread count in real-time
  useEffect(() => {
    const unsubscribe = onChatMessage((data) => {
      // If the message is from someone else, increment unread count
      const senderId = typeof data.senderId === 'object' ? data.senderId._id : data.senderId;
      if (senderId !== user?._id) {
        // Get the conversation ID from the message
        const messageConversationId = typeof data.conversationId === 'object'
          ? (data.conversationId as any)._id
          : data.conversationId;

        // Only increment unread if user is NOT currently viewing this conversation
        const isViewingThisConversation = activeConversation?._id === messageConversationId;

        if (!isViewingThisConversation) {
          // Increment unread count immediately (real-time)
          setUnreadCount(prev => {
            const newCount = prev + 1;
            onUnreadCountChange?.(newCount);
            return newCount;
          });
        }

        // Refresh conversations list if sidebar is open (to update last message preview)
        if (isOpen) {
          fetchConversations();
        }
      }
    });
    return unsubscribe;
  }, [onChatMessage, user?._id, onUnreadCountChange, isOpen, fetchConversations, activeConversation?._id]);

  // Fetch conversations when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen, fetchConversations]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  // Handle back to list
  const handleBackToList = () => {
    setActiveConversation(null);
    fetchConversations(); // Refresh conversations
    // Fetch the actual unread count from server since viewing a conversation marks it as read
    fetchUnreadCount();
  };

  // Handle new DM created
  const handleNewDMCreated = (conversation: Conversation) => {
    setConversations(prev => {
      // Check if already exists
      if (prev.some(c => c._id === conversation._id)) return prev;
      return [conversation, ...prev];
    });
    setActiveConversation(conversation);
    setShowNewChatModal(false);
  };

  // Handle typing in active conversation
  const handleTyping = (isTyping: boolean) => {
    // Will be connected to WebSocket
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-dark-500 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {activeConversation ? (
          // Message Thread View
          <>
            <ChatHeader
              conversation={activeConversation}
              onBack={handleBackToList}
              showBackButton
            />
            <div className="flex-1 overflow-hidden">
              <MessageThread
                conversation={activeConversation}
                onTyping={handleTyping}
                typingUsers={typingUsers[activeConversation._id] || []}
              />
            </div>
          </>
        ) : (
          // Conversation List View
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-dark-400">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Messages
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {/* New Chat Button */}
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
                  title="New message"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-2">
              <ConversationList
                conversations={conversations}
                activeConversationId={undefined}
                onSelectConversation={handleSelectConversation}
                loading={loading}
              />
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewConversationModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          onConversationCreated={handleNewDMCreated}
        />
      )}
    </>
  );
};
