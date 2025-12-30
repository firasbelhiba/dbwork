'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { getInitials } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { CommandPalette } from '@/components/command/CommandPalette';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { UserRole } from '@/types/user';

interface HeaderProps {
  onMenuToggle?: () => void;
  onTodoToggle?: () => void;
  onChatToggle?: () => void;
  todoCount?: number;
  chatUnreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, onTodoToggle, onChatToggle, todoCount = 0, chatUnreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { onlineCount, connected } = useWebSocket();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const handleCloseCommandPalette = useCallback(() => {
    setShowCommandPalette(false);
  }, [setShowCommandPalette]);

  if (!user) return null;

  return (
    <header className="bg-white dark:bg-dark-500 border-b border-gray-200 dark:border-dark-400 sticky top-0 z-40 transition-colors">
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6">
        {/* Left side - Hamburger menu + Logo */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hamburger menu - mobile only */}
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors md:hidden"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
            {/* Light mode logo (original) */}
            <Image
              src="/logo-horizontal.png"
              alt="Dar Blockchain"
              width={160}
              height={40}
              priority
              className="h-6 md:h-8 w-auto dark:hidden"
            />
            {/* Dark mode logo (white) */}
            <Image
              src="/logo-horizontal-white.png"
              alt="Dar Blockchain"
              width={160}
              height={40}
              priority
              className="h-6 md:h-8 w-auto hidden dark:block"
            />
          </Link>
        </div>

        {/* Search - hidden on mobile, full on desktop */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-8">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="w-full relative h-10 pl-10 pr-20 rounded-md border-2 border-gray-300 dark:border-dark-300 bg-white dark:bg-dark-400 text-left text-gray-400 dark:text-gray-500 hover:border-primary-500 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
          >
            Search issues, projects...
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 font-mono">
              {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
            </kbd>
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search icon - mobile only */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors md:hidden"
            aria-label="Search"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Create button - icon only on mobile, full on desktop */}
          <Link
            href="/issues/new"
            className="inline-flex items-center justify-center gap-2 p-2 md:px-4 md:py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors shadow-sm font-medium"
            aria-label="Create issue"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden md:inline">Create</span>
          </Link>

          {/* Online users indicator */}
          {connected && onlineCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-dark-400"
              title={`${onlineCount} user${onlineCount !== 1 ? 's' : ''} online`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{onlineCount}</span>
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            )}
          </button>

          {/* Chat */}
          <button
            onClick={onChatToggle}
            className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
            title="Messages"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {chatUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-500 rounded-full">
                {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
              </span>
            )}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Todo Queue */}
          <button
            onClick={onTodoToggle}
            className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
            title="My Queue"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            {todoCount > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-500 rounded-full">
                {todoCount > 9 ? '9+' : todoCount}
              </span>
            )}
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
            >
              <UserAvatar
                userId={user._id}
                avatar={user.avatar}
                firstName={user.firstName}
                lastName={user.lastName}
                size="md"
                showOnlineStatus={true}
              />
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-500 rounded-md shadow-lg border border-gray-200 dark:border-dark-400 py-1">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-400">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400"
                >
                  Profile Settings
                </Link>
                {user.role === UserRole.ADMIN && (
                  <Link
                    href="/admin/changelogs"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Manage Changelogs
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <CommandPalette onClose={handleCloseCommandPalette} />
      )}
    </header>
  );
};
