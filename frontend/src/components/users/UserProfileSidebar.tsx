'use client';

import React from 'react';
import { User } from '@/types/user';
import { Badge } from '@/components/common';
import { getInitials, formatDateTime, getRelativeTime } from '@/lib/utils';

interface UserProfileSidebarProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileSidebar: React.FC<UserProfileSidebarProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  if (!user) return null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'critical';
      case 'project_manager':
        return 'high';
      case 'developer':
        return 'medium';
      case 'viewer':
        return 'low';
      default:
        return 'default';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white dark:bg-dark-400 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Profile Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-73px)]">
          {/* Profile Section */}
          <div className="px-6 py-8 border-b border-gray-200 dark:border-dark-300">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-3xl font-bold shadow-lg mb-4">
                {getInitials(user.firstName, user.lastName)}
              </div>

              {/* Name */}
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
                {user.firstName} {user.lastName}
              </h3>

              {/* Email */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {user.email}
              </p>

              {/* Role Badge */}
              <Badge variant={getRoleBadgeVariant(user.role) as any}>
                {formatRole(user.role)}
              </Badge>

              {/* Status */}
              <div className="mt-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-success-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="px-6 py-6">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
              Account Information
            </h4>

            <div className="space-y-4">
              {/* Member Since */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Member Since
                </label>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDateTime(user.createdAt)}
                </p>
              </div>

              {/* Last Login */}
              {user.lastLoginAt && (
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                    Last Login
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {getRelativeTime(user.lastLoginAt)}
                  </p>
                </div>
              )}

              {/* Account Status */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
                  Account Status
                </label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.isActive
                      ? 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences Section */}
          {user.preferences?.emailNotifications && (
            <div className="px-6 py-6 border-t border-gray-200 dark:border-dark-300">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Email Notifications
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Issue Assigned</span>
                  <div className={`w-10 h-5 rounded-full ${user.preferences.emailNotifications.issueAssigned ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${user.preferences.emailNotifications.issueAssigned ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Issue Updated</span>
                  <div className={`w-10 h-5 rounded-full ${user.preferences.emailNotifications.issueUpdated ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${user.preferences.emailNotifications.issueUpdated ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Issue Commented</span>
                  <div className={`w-10 h-5 rounded-full ${user.preferences.emailNotifications.issueCommented ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${user.preferences.emailNotifications.issueCommented ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Mentions</span>
                  <div className={`w-10 h-5 rounded-full ${user.preferences.emailNotifications.mentions ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${user.preferences.emailNotifications.mentions ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sprint Updates</span>
                  <div className={`w-10 h-5 rounded-full ${user.preferences.emailNotifications.sprintUpdates ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${user.preferences.emailNotifications.sprintUpdates ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
