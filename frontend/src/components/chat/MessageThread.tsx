'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Conversation, MessagesResponse, ReadReceipt } from '@/types/chat';
import { chatAPI } from '@/lib/api';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { LogoLoader } from '@/components/common/LogoLoader';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface MessageThreadProps {
  conversation: Conversation;
  onTyping?: (isTyping: boolean) => void;
  typingUsers?: string[];
  searchQuery?: string;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  onTyping,
  typingUsers = [],
  searchQuery = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [wsTypingUsers, setWsTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const {
    joinChat,
    leaveChat,
    onChatMessage,
    onChatMessageUpdated,
    onChatMessageDeleted,
    onChatTyping,
    onChatRead,
    sendTypingIndicator
  } = useWebSocket();

  // Local read receipts state for real-time updates
  const [localReadReceipts, setLocalReadReceipts] = useState<ReadReceipt[]>(conversation.readReceipts || []);

  // Sync read receipts when conversation changes
  useEffect(() => {
    setLocalReadReceipts(conversation.readReceipts || []);
  }, [conversation._id, conversation.readReceipts]);

  // Helper to get user name from ID using conversation participants
  const getUserNameById = useCallback((userId: string): string => {
    const participant = conversation.participants.find(p => p._id === userId);
    if (participant) {
      return participant.firstName || participant.lastName || 'Someone';
    }
    return 'Someone';
  }, [conversation.participants]);

  // Convert typing user IDs to names
  const typingUserNames = [...new Set([...typingUsers, ...wsTypingUsers])].map(getUserNameById);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getMessages(conversation._id);
      const data: MessagesResponse = response.data;
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversation._id]);

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;

    try {
      setLoadingMore(true);
      const oldestMessageId = messages[0]._id;
      const response = await chatAPI.getMessages(conversation._id, { before: oldestMessageId });
      const data: MessagesResponse = response.data;
      setMessages(prev => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [conversation._id, hasMore, loadingMore, messages]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark as read when viewing
  useEffect(() => {
    chatAPI.markAsRead(conversation._id).catch(console.error);
  }, [conversation._id]);

  // Join WebSocket chat room and listen for real-time messages
  useEffect(() => {
    // Join the chat room
    joinChat(conversation._id);

    // Listen for new messages
    const unsubMessage = onChatMessage((data) => {
      // Only add if it's for this conversation and not already in the list
      if (data.conversationId === conversation._id || (data as any).conversationId?._id === conversation._id) {
        setMessages(prev => {
          // Check if message already exists
          if (prev.some(m => m._id === data._id)) {
            return prev;
          }
          return [...prev, data as ChatMessage];
        });
      }
    });

    // Listen for message updates
    const unsubUpdated = onChatMessageUpdated((data) => {
      if (data.conversationId === conversation._id || (data as any).conversationId?._id === conversation._id) {
        setMessages(prev =>
          prev.map(m => (m._id === data._id ? data as ChatMessage : m))
        );
      }
    });

    // Listen for message deletions
    const unsubDeleted = onChatMessageDeleted((data) => {
      setMessages(prev =>
        prev.map(m =>
          m._id === data.messageId
            ? { ...m, isDeleted: true, content: 'This message has been deleted' }
            : m
        )
      );
    });

    // Listen for typing indicators
    const unsubTyping = onChatTyping((data) => {
      if (data.conversationId === conversation._id && data.userId !== user?._id) {
        setWsTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.userId) ? prev : [...prev, data.userId];
          } else {
            return prev.filter(id => id !== data.userId);
          }
        });
      }
    });

    // Listen for read receipts
    const unsubRead = onChatRead((data) => {
      if (data.conversationId === conversation._id) {
        setLocalReadReceipts(prev => {
          const existingIndex = prev.findIndex(r => r.userId === data.userId);
          if (existingIndex >= 0) {
            // Update existing receipt
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              lastReadAt: data.readAt,
            };
            return updated;
          } else {
            // Add new receipt
            return [...prev, { userId: data.userId, lastReadAt: data.readAt, unreadCount: 0 }];
          }
        });
      }
    });

    // Cleanup: leave chat room and unsubscribe
    return () => {
      leaveChat(conversation._id);
      unsubMessage();
      unsubUpdated();
      unsubDeleted();
      unsubTyping();
      unsubRead();
    };
  }, [conversation._id, joinChat, leaveChat, onChatMessage, onChatMessageUpdated, onChatMessageDeleted, onChatTyping, onChatRead, user?._id]);

  // Handle scroll for infinite loading
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  // Send message
  const handleSend = async (content: string, replyToId?: string, mentions?: string[]) => {
    try {
      const response = await chatAPI.sendMessage(conversation._id, {
        content,
        replyTo: replyToId,
        mentions,
      });
      // Add message to state immediately for instant feedback
      // The duplicate check in WebSocket handler will prevent duplicates
      setMessages(prev => {
        if (prev.some(m => m._id === response.data._id)) {
          return prev;
        }
        return [...prev, response.data];
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Send message with files
  const handleSendWithFiles = async (content: string, files: File[], replyToId?: string, mentions?: string[]) => {
    try {
      const response = await chatAPI.sendMessageWithAttachments(conversation._id, {
        content,
        files,
        replyTo: replyToId,
        mentions,
      });
      // Add message to state immediately for instant feedback
      // The duplicate check in WebSocket handler will prevent duplicates
      setMessages(prev => {
        if (prev.some(m => m._id === response.data._id)) {
          return prev;
        }
        return [...prev, response.data];
      });
    } catch (error) {
      console.error('Error sending message with files:', error);
      throw error;
    }
  };

  // Handle reply
  const handleReply = (message: ChatMessage) => {
    setReplyTo(message);
  };

  // Handle edit
  const handleEdit = async (message: ChatMessage) => {
    const newContent = prompt('Edit message:', message.content);
    if (newContent && newContent !== message.content) {
      try {
        const response = await chatAPI.updateMessage(message._id, newContent);
        setMessages(prev =>
          prev.map(m => (m._id === message._id ? response.data : m))
        );
      } catch (error) {
        console.error('Error editing message:', error);
      }
    }
  };

  // Handle delete
  const handleDelete = async (message: ChatMessage) => {
    if (confirm('Delete this message?')) {
      try {
        await chatAPI.deleteMessage(message._id);
        setMessages(prev =>
          prev.map(m =>
            m._id === message._id
              ? { ...m, isDeleted: true, content: 'This message has been deleted' }
              : m
          )
        );
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  // Handle reaction
  const handleReact = async (message: ChatMessage, reaction: string) => {
    try {
      const response = await chatAPI.addReaction(message._id, reaction);
      setMessages(prev =>
        prev.map(m => (m._id === message._id ? response.data : m))
      );
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Add new message from WebSocket
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      // Check if message already exists
      if (prev.some(m => m._id === message._id)) return prev;
      return [...prev, message];
    });
  }, []);

  // Update message from WebSocket
  const updateMessage = useCallback((message: ChatMessage) => {
    setMessages(prev =>
      prev.map(m => (m._id === message._id ? message : m))
    );
  }, []);

  // Delete message from WebSocket
  const removeMessage = useCallback((messageId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m._id === messageId
          ? { ...m, isDeleted: true, content: 'This message has been deleted' }
          : m
      )
    );
  }, []);

  // Expose methods for parent component
  useEffect(() => {
    (window as any).__chatThread = {
      addMessage,
      updateMessage,
      removeMessage,
      refresh: fetchMessages,
    };
    return () => {
      delete (window as any).__chatThread;
    };
  }, [addMessage, updateMessage, removeMessage, fetchMessages]);

  // Filter messages based on search query
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m =>
        m.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Determine what to display
  const isSearching = searchQuery.trim().length > 0;
  const noSearchResults = isSearching && filteredMessages.length === 0 && messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {/* Encryption Notice */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 mb-4 mx-auto max-w-md rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
          <svg
            className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-xs text-amber-700 dark:text-amber-300 text-center">
            Messages are end-to-end encrypted with AES-256-GCM. Only participants can read them.
          </p>
        </div>

        {/* Load more */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <LogoLoader size="sm" text="Loading more" />
          </div>
        )}

        {/* Search results info */}
        {isSearching && filteredMessages.length > 0 && (
          <div className="text-center py-2 mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-400 px-3 py-1 rounded-full">
              {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''} found
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LogoLoader size="sm" text="Loading messages" />
          </div>
        ) : noSearchResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No messages match your search</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Try different keywords
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
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
            <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredMessages.map(message => (
              <MessageBubble
                key={message._id}
                message={message}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={handleReact}
                highlightText={searchQuery}
                readReceipts={localReadReceipts}
                isDirectMessage={conversation.type === 'direct'}
              />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {typingUserNames.length > 0 && (
          <TypingIndicator users={typingUserNames} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onSendWithFiles={handleSendWithFiles}
        onTyping={(isTyping) => {
          // Send typing indicator via WebSocket
          sendTypingIndicator(conversation._id, isTyping);
          // Also call the prop callback if provided
          onTyping?.(isTyping);
        }}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};
