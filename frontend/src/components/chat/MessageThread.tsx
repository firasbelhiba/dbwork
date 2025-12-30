'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, Conversation, MessagesResponse } from '@/types/chat';
import { chatAPI } from '@/lib/api';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';

interface MessageThreadProps {
  conversation: Conversation;
  onTyping?: (isTyping: boolean) => void;
  typingUsers?: string[];
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  onTyping,
  typingUsers = [],
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
    sendTypingIndicator
  } = useWebSocket();

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
    console.log('[MessageThread] Joined chat room:', conversation._id);

    // Listen for new messages
    const unsubMessage = onChatMessage((data) => {
      console.log('[MessageThread] Received WebSocket message:', data);
      // Only add if it's for this conversation and not already in the list
      if (data.conversationId === conversation._id || (data as any).conversationId?._id === conversation._id) {
        setMessages(prev => {
          // Check if message already exists (might have been added by our own send)
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

    // Cleanup: leave chat room and unsubscribe
    return () => {
      leaveChat(conversation._id);
      console.log('[MessageThread] Left chat room:', conversation._id);
      unsubMessage();
      unsubUpdated();
      unsubDeleted();
      unsubTyping();
    };
  }, [conversation._id, joinChat, leaveChat, onChatMessage, onChatMessageUpdated, onChatMessageDeleted, onChatTyping, user?._id]);

  // Handle scroll for infinite loading
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    if (scrollTop < 100 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  };

  // Send message
  const handleSend = async (content: string, replyToId?: string) => {
    console.log('[MessageThread] Sending message:', { conversationId: conversation._id, content, replyToId });
    try {
      const response = await chatAPI.sendMessage(conversation._id, {
        content,
        replyTo: replyToId,
      });
      console.log('[MessageThread] Message sent successfully:', response.data);
      setMessages(prev => [...prev, response.data]);
    } catch (error: any) {
      console.error('[MessageThread] Error sending message:', error);
      console.error('[MessageThread] Error response:', error.response?.data);
      throw error;
    }
  };

  // Send message with files
  const handleSendWithFiles = async (content: string, files: File[], replyToId?: string) => {
    try {
      const response = await chatAPI.sendMessageWithAttachments(conversation._id, {
        content,
        files,
        replyTo: replyToId,
      });
      setMessages(prev => [...prev, response.data]);
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {/* Load more */}
        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
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
            {messages.map(message => (
              <MessageBubble
                key={message._id}
                message={message}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={handleReact}
              />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {(typingUsers.length > 0 || wsTypingUsers.length > 0) && (
          <TypingIndicator users={[...new Set([...typingUsers, ...wsTypingUsers])]} />
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
