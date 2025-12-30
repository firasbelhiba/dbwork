'use client';

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Conversation, ChatMessage } from '@/types/chat';
import { User } from '@/types/user';
import { chatAPI } from '@/lib/api';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageThread } from '@/components/chat/MessageThread';
import { NewConversationModal } from '@/components/chat/NewConversationModal';
import { LogoLoader } from '@/components/common/LogoLoader';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const conversationIdParam = searchParams.get('conversation');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle search with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If query is empty, hide results
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      setShowSearchResults(true);

      try {
        const response = await chatAPI.searchMessages(query.trim());
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Error searching messages:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  // Clear search and navigate to conversation
  const handleSearchResultClick = async (message: ChatMessage) => {
    const conversationId = typeof message.conversationId === 'object'
      ? (message.conversationId as any)._id
      : message.conversationId;

    // Find the conversation in the list
    let conversation = conversations.find(c => c._id === conversationId);

    // If not found, fetch it
    if (!conversation) {
      try {
        const response = await chatAPI.getConversation(conversationId);
        conversation = response.data;
        setConversations(prev => [conversation!, ...prev]);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        return;
      }
    }

    // Clear search and select conversation
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    if (conversation) {
      setActiveConversation(conversation);
      router.push(`/chat?conversation=${conversationId}`, { scroll: false });
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-lg bg-gray-100 dark:bg-dark-400 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-dark-300 rounded-full transition-colors"
                >
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Search Results or Conversation List */}
          <div className="flex-1 overflow-y-auto px-2">
            {showSearchResults ? (
              <div className="space-y-1">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <LogoLoader size="sm" text="Searching" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No messages found</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    {searchResults.map((message) => {
                      const sender = message.senderId as User;
                      const senderName = sender?.firstName && sender?.lastName
                        ? `${sender.firstName} ${sender.lastName}`
                        : sender?.firstName || 'Unknown';

                      return (
                        <button
                          key={message._id}
                          onClick={() => handleSearchResultClick(message)}
                          className="w-full text-left p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            {sender?.avatar ? (
                              <img
                                src={sender.avatar}
                                alt={senderName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                                {senderName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {senderName}
                                </span>
                                <span className="text-xs text-gray-400 flex-shrink-0">
                                  {format(new Date(message.createdAt), 'MMM d')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeConversationId={activeConversation?._id}
                onSelectConversation={handleSelectConversation}
                loading={loading}
              />
            )}
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
          <LogoLoader size="lg" text="Loading chat" />
        </div>
      </DashboardLayout>
    }>
      <ChatPageContent />
    </Suspense>
  );
}
