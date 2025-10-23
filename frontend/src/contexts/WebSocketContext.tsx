'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  joinSprint: (sprintId: string) => void;
  leaveSprint: (sprintId: string) => void;
  joinIssue: (issueId: string) => void;
  leaveIssue: (issueId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      // User not logged in, disconnect socket if exists
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
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
      console.log('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinProject = (projectId: string) => {
    if (socket && connected) {
      socket.emit('join:project', projectId);
    }
  };

  const leaveProject = (projectId: string) => {
    if (socket && connected) {
      socket.emit('leave:project', projectId);
    }
  };

  const joinSprint = (sprintId: string) => {
    if (socket && connected) {
      socket.emit('join:sprint', sprintId);
    }
  };

  const leaveSprint = (sprintId: string) => {
    if (socket && connected) {
      socket.emit('leave:sprint', sprintId);
    }
  };

  const joinIssue = (issueId: string) => {
    if (socket && connected) {
      socket.emit('join:issue', issueId);
    }
  };

  const leaveIssue = (issueId: string) => {
    if (socket && connected) {
      socket.emit('leave:issue', issueId);
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        joinProject,
        leaveProject,
        joinSprint,
        leaveSprint,
        joinIssue,
        leaveIssue,
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
