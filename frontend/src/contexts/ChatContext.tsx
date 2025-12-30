'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Conversation } from '@/types/chat';

interface ChatContextValue {
  isChatOpen: boolean;
  pendingConversation: Conversation | null;
  pendingProjectId: string | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openConversation: (conversation: Conversation) => void;
  openProjectChat: (projectId: string) => void;
  clearPendingConversation: () => void;
  clearPendingProjectId: () => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [pendingConversation, setPendingConversation] = useState<Conversation | null>(null);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const openChat = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsChatOpen(prev => !prev);
  }, []);

  const openConversation = useCallback((conversation: Conversation) => {
    setPendingConversation(conversation);
    setIsChatOpen(true);
  }, []);

  const openProjectChat = useCallback((projectId: string) => {
    setPendingProjectId(projectId);
    setIsChatOpen(true);
  }, []);

  const clearPendingConversation = useCallback(() => {
    setPendingConversation(null);
  }, []);

  const clearPendingProjectId = useCallback(() => {
    setPendingProjectId(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isChatOpen,
        pendingConversation,
        pendingProjectId,
        openChat,
        closeChat,
        toggleChat,
        openConversation,
        openProjectChat,
        clearPendingConversation,
        clearPendingProjectId,
        unreadCount,
        setUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
