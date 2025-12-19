'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface TimerAutoStoppedData {
  issueId: string;
  issueKey: string;
  reason: string;
}

interface OnlineUsersData {
  count: number;
  userIds: string[];
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

    // Request current online count when connected
    newSocket.on('connected', () => {
      newSocket.emit('get:online-count');
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
