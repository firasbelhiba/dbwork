'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { showChatToast } from '@/components/chat/ChatToast';

interface TimerAutoStoppedData {
  issueId: string;
  issueKey: string;
  reason: string;
}

interface NotificationData {
  _id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  link?: string;
  relatedIssue?: any;
  relatedProject?: any;
  metadata?: {
    conversationId?: string;
    senderId?: string;
    senderName?: string;
    senderAvatar?: string;
  };
  createdAt: string;
}

// Notification sound utility - plays MP3 file
const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(error => {
      console.warn('Could not play notification sound:', error);
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

interface OnlineUsersData {
  count: number;
  userIds: string[];
}

interface ChatMessageData {
  _id: string;
  conversationId: string;
  senderId: any;
  content: string;
  type: string;
  attachments: any[];
  createdAt: string;
}

interface ChatTypingData {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface ChatReadData {
  conversationId: string;
  userId: string;
  readAt: string;
}

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  onlineCount: number;
  onlineUserIds: string[];
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  joinSprint: (sprintId: string) => void;
  leaveSprint: (sprintId: string) => void;
  joinIssue: (issueId: string) => void;
  leaveIssue: (issueId: string) => void;
  onTimerAutoStopped: (callback: (data: TimerAutoStoppedData) => void) => () => void;
  // Chat methods
  joinChat: (conversationId: string) => void;
  leaveChat: (conversationId: string) => void;
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => void;
  onChatMessage: (callback: (data: ChatMessageData) => void) => () => void;
  onChatMessageUpdated: (callback: (data: ChatMessageData) => void) => () => void;
  onChatMessageDeleted: (callback: (data: { messageId: string }) => void) => () => void;
  onChatTyping: (callback: (data: ChatTypingData) => void) => () => void;
  onChatRead: (callback: (data: ChatReadData) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const { user } = useAuth();

  // Use refs to avoid stale closures and unnecessary re-renders
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);
  const timerAutoStoppedCallbacksRef = useRef<Set<(data: TimerAutoStoppedData) => void>>(new Set());

  // Chat callback refs
  const chatMessageCallbacksRef = useRef<Set<(data: ChatMessageData) => void>>(new Set());
  const chatMessageUpdatedCallbacksRef = useRef<Set<(data: ChatMessageData) => void>>(new Set());
  const chatMessageDeletedCallbacksRef = useRef<Set<(data: { messageId: string }) => void>>(new Set());
  const chatTypingCallbacksRef = useRef<Set<(data: ChatTypingData) => void>>(new Set());
  const chatReadCallbacksRef = useRef<Set<(data: ChatReadData) => void>>(new Set());

  // Keep refs in sync with state
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    if (!user) {
      // User not logged in, disconnect socket if exists
      if (socketRef.current) {
        socketRef.current.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Prevent creating multiple connections
    if (socketRef.current?.connected) {
      return;
    }

    // Get access token
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    // Create socket connection
    const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const newSocket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Global listener for timer auto-paused events (works from any page)
    // Timer is paused at end of day so user can resume if they want to work extra hours
    newSocket.on('timer:auto-paused', (data: TimerAutoStoppedData) => {
      console.log('[WebSocket] Timer auto-paused event received:', data);
      toast(`Timer paused for ${data.issueKey} (end of day) - Click play to resume`, {
        icon: '⏸️',
        duration: 6000,
      });
      // Notify all registered callbacks using ref to avoid stale closure
      timerAutoStoppedCallbacksRef.current.forEach(callback => callback(data));
    });

    // Listen for online users count updates
    newSocket.on('users:online-count', (data: OnlineUsersData) => {
      setOnlineCount(data.count);
      setOnlineUserIds(data.userIds);
    });

    // Listen for new notifications and play sound
    newSocket.on('notification:new', (notification: NotificationData) => {
      console.log('[WebSocket] New notification received:', notification);
      // Play notification sound
      playNotificationSound();

      // Use custom chat toast for chat message notifications
      if (notification.type === 'chat_message' && notification.metadata?.conversationId) {
        showChatToast(
          notification.metadata.senderName || notification.title.replace('New message from ', ''),
          notification.message,
          notification.metadata.conversationId,
          notification.metadata.senderAvatar
        );
      } else {
        // Show standard toast notification for other types
        toast(notification.message || notification.title || 'New notification', {
          icon: '🔔',
          duration: 5000,
        });
      }
    });

    // Request current online count when connected
    newSocket.on('connected', () => {
      newSocket.emit('get:online-count');
    });

    // Chat event listeners
    newSocket.on('chat:message', (data: ChatMessageData) => {
      console.log('[WebSocket] New chat message:', data);
      chatMessageCallbacksRef.current.forEach(callback => callback(data));
    });

    newSocket.on('chat:message:updated', (data: ChatMessageData) => {
      console.log('[WebSocket] Chat message updated:', data);
      chatMessageUpdatedCallbacksRef.current.forEach(callback => callback(data));
    });

    newSocket.on('chat:message:deleted', (data: { messageId: string }) => {
      console.log('[WebSocket] Chat message deleted:', data);
      chatMessageDeletedCallbacksRef.current.forEach(callback => callback(data));
    });

    newSocket.on('chat:typing', (data: ChatTypingData) => {
      chatTypingCallbacksRef.current.forEach(callback => callback(data));
    });

    newSocket.on('chat:read', (data: ChatReadData) => {
      chatReadCallbacksRef.current.forEach(callback => callback(data));
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  // Use refs in callbacks to avoid dependency on socket/connected state
  // This prevents unnecessary re-renders and callback recreations
  const joinProject = useCallback((projectId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('join:project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('leave:project', projectId);
    }
  }, []);

  const joinSprint = useCallback((sprintId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('join:sprint', sprintId);
    }
  }, []);

  const leaveSprint = useCallback((sprintId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('leave:sprint', sprintId);
    }
  }, []);

  const joinIssue = useCallback((issueId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('join:issue', issueId);
    }
  }, []);

  const leaveIssue = useCallback((issueId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('leave:issue', issueId);
    }
  }, []);

  const onTimerAutoStopped = useCallback((callback: (data: TimerAutoStoppedData) => void) => {
    timerAutoStoppedCallbacksRef.current.add(callback);
    // Return unsubscribe function
    return () => {
      timerAutoStoppedCallbacksRef.current.delete(callback);
    };
  }, []);

  // Chat methods
  const joinChat = useCallback((conversationId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('chat:join', conversationId);
    }
  }, []);

  const leaveChat = useCallback((conversationId: string) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('chat:leave', conversationId);
    }
  }, []);

  const sendTypingIndicator = useCallback((conversationId: string, isTyping: boolean) => {
    if (socketRef.current && connectedRef.current) {
      socketRef.current.emit('chat:typing', { conversationId, isTyping });
    }
  }, []);

  const onChatMessage = useCallback((callback: (data: ChatMessageData) => void) => {
    chatMessageCallbacksRef.current.add(callback);
    return () => {
      chatMessageCallbacksRef.current.delete(callback);
    };
  }, []);

  const onChatMessageUpdated = useCallback((callback: (data: ChatMessageData) => void) => {
    chatMessageUpdatedCallbacksRef.current.add(callback);
    return () => {
      chatMessageUpdatedCallbacksRef.current.delete(callback);
    };
  }, []);

  const onChatMessageDeleted = useCallback((callback: (data: { messageId: string }) => void) => {
    chatMessageDeletedCallbacksRef.current.add(callback);
    return () => {
      chatMessageDeletedCallbacksRef.current.delete(callback);
    };
  }, []);

  const onChatTyping = useCallback((callback: (data: ChatTypingData) => void) => {
    chatTypingCallbacksRef.current.add(callback);
    return () => {
      chatTypingCallbacksRef.current.delete(callback);
    };
  }, []);

  const onChatRead = useCallback((callback: (data: ChatReadData) => void) => {
    chatReadCallbacksRef.current.add(callback);
    return () => {
      chatReadCallbacksRef.current.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        onlineCount,
        onlineUserIds,
        joinProject,
        leaveProject,
        joinSprint,
        leaveSprint,
        joinIssue,
        leaveIssue,
        onTimerAutoStopped,
        // Chat methods
        joinChat,
        leaveChat,
        sendTypingIndicator,
        onChatMessage,
        onChatMessageUpdated,
        onChatMessageDeleted,
        onChatTyping,
        onChatRead,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
