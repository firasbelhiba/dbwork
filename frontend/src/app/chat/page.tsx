'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Conversation } from '@/types/chat';
import { chatAPI } from '@/lib/api';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageThread } from '@/components/chat/MessageThread';
import { NewConversationModal } from '@/components/chat/NewConversationModal';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationIdParam = searchParams.get('conversation');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      setConversations(response.data);

      // If conversation ID is in URL, select it
      if (conversationIdParam) {
        const conv = response.data.find((c: Conversation) => c._id === conversationIdParam);
        if (conv) {
          setActiveConversation(conv);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationIdParam]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Handle conversation selection
  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    router.push(`/chat?conversation=${conversation._id}`, { scroll: false });
  };

  // Handle new DM created
  const handleNewDMCreated = (conversation: Conversation) => {
    setConversations(prev => {
      if (prev.some(c => c._id === conversation._id)) return prev;
      return [conversation, ...prev];
    });
    setActiveConversation(conversation);
    router.push(`/chat?conversation=${conversation._id}`, { scroll: false });
    setShowNewChatModal(false);
  };

  return (
    <DashboardLayout>
      <div className="h-full flex">
        {/* Conversation List - Left Panel */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-dark-400 bg-white dark:bg-dark-500 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-dark-400">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Messages</h1>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
              title="New message"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3">
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
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-dark-400 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto px-2">
            <ConversationList
              conversations={conversations}
              activeConversationId={activeConversation?._id}
              onSelectConversation={handleSelectConversation}
              loading={loading}
            />
          </div>
        </div>

        {/* Message Thread - Right Panel */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-600">
          {activeConversation ? (
            <>
              <ChatHeader conversation={activeConversation} />
              <div className="flex-1 overflow-hidden">
                <MessageThread conversation={activeConversation} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <svg
                className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Select a conversation
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
                Choose a conversation from the list or start a new one to begin messaging
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Start a new chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewConversationModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          onConversationCreated={handleNewDMCreated}
        />
      )}
    </DashboardLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
