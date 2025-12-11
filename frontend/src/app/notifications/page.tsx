'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Breadcrumb, LogoLoader } from '@/components/common';
import { notificationsAPI } from '@/lib/api';
import { Notification, NotificationType, NOTIFICATION_TYPE_GROUPS } from '@/types/notification';
import toast from 'react-hot-toast';

// Type filter options using groups
type TypeFilterOption = 'all' | 'assignments' | 'updates' | 'comments' | 'mentions' | 'sprints' | 'invitations';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationsAPI.getAll(filter === 'unread');
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(notifications.map(n =>
        n._id === id ? { ...n, read: true, readAt: new Date() } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true, readAt: new Date() })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all read notifications?')) return;

    try {
      await notificationsAPI.clearAll();
      setNotifications(notifications.filter(n => !n.read));
      toast.success('Read notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigation to the notification link
    e.stopPropagation();

    try {
      await notificationsAPI.delete(id);
      setNotifications(notifications.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    // Assignments
    if (NOTIFICATION_TYPE_GROUPS.assignments.includes(type)) {
      return (
        <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      );
    }
    // Updates (status, priority, due date changes)
    if (NOTIFICATION_TYPE_GROUPS.updates.includes(type)) {
      return (
        <div className="flex-shrink-0 w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      );
    }
    // Comments
    if (NOTIFICATION_TYPE_GROUPS.comments.includes(type)) {
      return (
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      );
    }
    // Mentions
    if (NOTIFICATION_TYPE_GROUPS.mentions.includes(type)) {
      return (
        <div className="flex-shrink-0 w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
        </div>
      );
    }
    // Sprints
    if (NOTIFICATION_TYPE_GROUPS.sprints.includes(type)) {
      return (
        <div className="flex-shrink-0 w-12 h-12 bg-info-100 dark:bg-info-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-info-600 dark:text-info-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      );
    }
    // Invitations / Project membership
    if (NOTIFICATION_TYPE_GROUPS.invitations.includes(type)) {
      return (
        <div className="flex-shrink-0 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
          </svg>
        </div>
      );
    }
    // Default icon for any other type
    return (
      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const timestamp = new Date(date);
    const seconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return timestamp.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Get the types for a filter group
  const getGroupTypes = (group: TypeFilterOption): NotificationType[] => {
    if (group === 'all') return [];
    return NOTIFICATION_TYPE_GROUPS[group] || [];
  };

  // Apply type filter using groups
  const filteredNotifications = typeFilter === 'all'
    ? notifications
    : notifications.filter(n => getGroupTypes(typeFilter).includes(n.type));

  // Get counts for each notification type group
  const getGroupCount = (group: TypeFilterOption): number => {
    if (group === 'all') return notifications.length;
    const types = getGroupTypes(group);
    return notifications.filter(n => types.includes(n.type)).length;
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            {
              label: 'Home',
              href: '/dashboard',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
            {
              label: 'Notifications',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ),
            },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 border border-primary-300 dark:border-primary-700 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                Mark all as read
              </button>
            )}
            {notifications.some(n => n.read) && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors"
              >
                Clear read
              </button>
            )}
          </div>
        </div>

        {/* Read/Unread Filter Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-8">
            <button
              onClick={() => setFilter('all')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === 'all'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              All
              {notifications.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-dark-300 rounded-full text-xs">
                  {notifications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                filter === 'unread'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-semibold">
                  {unreadCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Type Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Filter by Type
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-2 border-primary-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              All Types
              <span className="ml-2 text-xs opacity-75">({getGroupCount('all')})</span>
            </button>
            <button
              onClick={() => setTypeFilter('assignments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'assignments'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-2 border-primary-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Assignments
              <span className="ml-2 text-xs opacity-75">({getGroupCount('assignments')})</span>
            </button>
            <button
              onClick={() => setTypeFilter('updates')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'updates'
                  ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 border-2 border-success-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Updates
              <span className="ml-2 text-xs opacity-75">({getGroupCount('updates')})</span>
            </button>
            <button
              onClick={() => setTypeFilter('comments')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'comments'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Comments
              <span className="ml-2 text-xs opacity-75">({getGroupCount('comments')})</span>
            </button>
            <button
              onClick={() => setTypeFilter('mentions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'mentions'
                  ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 border-2 border-warning-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Mentions
              <span className="ml-2 text-xs opacity-75">({getGroupCount('mentions')})</span>
            </button>
            <button
              onClick={() => setTypeFilter('sprints')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'sprints'
                  ? 'bg-info-100 dark:bg-info-900/30 text-info-700 dark:text-info-400 border-2 border-info-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Sprints
              <span className="ml-2 text-xs opacity-75">({getGroupCount('sprints')})</span>
            </button>
            <button
              onClick={() => setTypeFilter('invitations')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === 'invitations'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-2 border-purple-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              Invitations
              <span className="ml-2 text-xs opacity-75">({getGroupCount('invitations')})</span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <LogoLoader size="md" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-24">
              <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                No notifications
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filter === 'unread' ? "You're all caught up!" : 'No notifications to show'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredNotifications.map((notification) => (
                <Link
                  key={notification._id}
                  href={notification.link || '#'}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification._id);
                    }
                  }}
                  className={`block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notification.read ? 'bg-primary-50 dark:bg-primary-900/10' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {getNotificationIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <span className="flex-shrink-0 w-2.5 h-2.5 bg-primary-500 rounded-full mt-1.5"></span>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notification._id)}
                            className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete notification"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {getRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
