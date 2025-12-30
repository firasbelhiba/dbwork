'use client';

import React, { ReactNode, useState, useCallback, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { WorkloadWarningBanner } from './WorkloadWarningBanner';
import { TodoQueueSidebar } from '@/components/sidebar/TodoQueueSidebar';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { useKeyboardShortcuts } from '@/hooks';
import { useChatContext } from '@/contexts/ChatContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  // Enable global keyboard shortcuts
  useKeyboardShortcuts();

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Todo queue sidebar state
  const [todoSidebarOpen, setTodoSidebarOpen] = useState(false);
  const [todoCount, setTodoCount] = useState(0);

  // Chat sidebar state from context
  const { isChatOpen, toggleChat, closeChat, unreadCount, setUnreadCount } = useChatContext();

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const toggleTodoSidebar = useCallback(() => {
    setTodoSidebarOpen(prev => !prev);
    // Close chat sidebar if opening todo
    closeChat();
  }, [closeChat]);

  const closeTodoSidebar = useCallback(() => {
    setTodoSidebarOpen(false);
  }, []);

  const handleToggleChatSidebar = useCallback(() => {
    toggleChat();
    // Close todo sidebar if opening chat
    setTodoSidebarOpen(false);
  }, [toggleChat]);

  const handleCloseChatSidebar = useCallback(() => {
    closeChat();
  }, [closeChat]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-dark-600">
      <WorkloadWarningBanner />
      <Header
        onMenuToggle={toggleMobileMenu}
        onTodoToggle={toggleTodoSidebar}
        onChatToggle={handleToggleChatSidebar}
        todoCount={todoCount}
        chatUnreadCount={unreadCount}
      />
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={closeMobileMenu}
            />
            {/* Mobile Sidebar Drawer */}
            <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden">
              <Sidebar onClose={closeMobileMenu} isMobile />
            </div>
          </>
        )}

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-600 transition-colors">
          {children}
        </main>
      </div>

      {/* Todo Queue Right Sidebar */}
      <TodoQueueSidebar
        isOpen={todoSidebarOpen}
        onClose={closeTodoSidebar}
        onCountChange={setTodoCount}
      />

      {/* Chat Right Sidebar */}
      <ChatSidebar
        isOpen={isChatOpen}
        onClose={handleCloseChatSidebar}
        onUnreadCountChange={setUnreadCount}
      />
    </div>
  );
};
