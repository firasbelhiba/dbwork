'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Input, Breadcrumb } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI, authAPI, adminAPI, googleCalendarAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { getInitials } from '@/lib/utils';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    firstName: '',
    email: '',
    lastName: '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification preferences
  const [notificationPreferences, setNotificationPreferences] = useState<any>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);

  // Admin state
  const [exportingDatabase, setExportingDatabase] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Google Calendar integration
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [loadingGoogleStatus, setLoadingGoogleStatus] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  // Gmail email for Google Calendar
  const [gmailEmail, setGmailEmail] = useState('');
  const [savingGmailEmail, setSavingGmailEmail] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
      setGmailEmail(user.gmailEmail || '');
      loadNotificationPreferences();
      loadGoogleCalendarStatus();

      // Load admin stats if user is admin
      if (user.role === 'admin') {
        loadDatabaseStats();
      }
    }
  }, [user]);

  const loadNotificationPreferences = async () => {
    if (!user?._id) return;

    try {
      const response = await usersAPI.getNotificationPreferences(user._id);
      setNotificationPreferences(response.data);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const loadDatabaseStats = async () => {
    setLoadingStats(true);
    try {
      const response = await adminAPI.getStats();
      setDbStats(response.data);
    } catch (error) {
      console.error('Error loading database stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadGoogleCalendarStatus = async () => {
    setLoadingGoogleStatus(true);
    try {
      const response = await googleCalendarAPI.getStatus();
      setGoogleCalendarConnected(response.data.isConnected);
    } catch (error) {
      console.error('Error loading Google Calendar status:', error);
    } finally {
      setLoadingGoogleStatus(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const response = await googleCalendarAPI.getAuthUrl();
      // Redirect to Google OAuth
      window.location.href = response.data.url;
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      toast.error(error.response?.data?.message || 'Failed to connect Google Calendar');
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setDisconnectingGoogle(true);
    try {
      await googleCalendarAPI.disconnect();
      setGoogleCalendarConnected(false);
      toast.success('Google Calendar disconnected successfully');
    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error(error.response?.data?.message || 'Failed to disconnect Google Calendar');
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  const handleSaveGmailEmail = async () => {
    if (!user?._id) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (gmailEmail && !emailRegex.test(gmailEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSavingGmailEmail(true);
    try {
      const response = await usersAPI.update(user._id, { gmailEmail: gmailEmail || null });
      updateUser(response.data);
      toast.success('Gmail email saved successfully!');
    } catch (error: any) {
      console.error('Error saving Gmail email:', error);
      toast.error(error.response?.data?.message || 'Failed to save Gmail email');
    } finally {
      setSavingGmailEmail(false);
    }
  };

  const handleExportDatabase = async () => {
    setExportingDatabase(true);
    try {
      const response = await adminAPI.exportDatabase();

      // Create download link
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dbwork-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Database exported successfully!');
    } catch (error: any) {
      console.error('Error exporting database:', error);
      toast.error(error.response?.data?.message || 'Failed to export database');
    } finally {
      setExportingDatabase(false);
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updateData: any = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
      };

      const response = await usersAPI.update(user!._id, updateData);
      updateUser(response.data);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      console.error('Error updating profile:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      console.error('Error changing password:', err);
      const errorMessage = err.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?._id) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
      toast.error('Please select an image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const response = await usersAPI.uploadAvatar(user._id, file);
      updateUser(response.data);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleNotificationToggle = async (notificationType: string) => {
    if (!user?._id || !notificationPreferences) return;

    const newValue = !notificationPreferences[notificationType];

    // Optimistic update
    setNotificationPreferences({
      ...notificationPreferences,
      [notificationType]: newValue,
    });

    setLoadingPreferences(true);

    try {
      await usersAPI.updateNotificationPreferences(user._id, {
        [notificationType]: newValue,
      });
      toast.success('Notification preference updated');
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      toast.error(error.response?.data?.message || 'Failed to update preferences');

      // Revert on error
      setNotificationPreferences({
        ...notificationPreferences,
        [notificationType]: !newValue,
      });
    } finally {
      setLoadingPreferences(false);
    }
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
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
              label: 'Profile',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ),
            },
          ]}
          className="mb-4 md:mb-6"
        />
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Profile Information */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-4 md:p-6 lg:p-8 mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">Profile Information</h2>

          {/* Profile Picture */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pb-6 border-b border-gray-200 dark:border-dark-400">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-dark-400"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-semibold border-4 border-gray-200 dark:border-dark-400">
                  {getInitials(user.firstName, user.lastName)}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center sm:items-start gap-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Profile Picture</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                Upload a new profile picture. JPG, PNG, GIF or WebP. Max 5MB.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {uploadingAvatar ? 'Uploading...' : 'Change Picture'}
              </Button>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Email (Read-only) */}
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={profileData.email}
              disabled
              helperText="Email address cannot be changed"
            />

            {/* First Name */}
            <Input
              label="First Name"
              name="firstName"
              value={profileData.firstName}
              onChange={handleProfileChange}
              placeholder="Enter your first name"
              required
            />

            {/* Last Name */}
            <Input
              label="Last Name"
              name="lastName"
              value={profileData.lastName}
              onChange={handleProfileChange}
              placeholder="Enter your last name"
              required
            />

            {/* Role (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-1.5">
                Role
              </label>
              <div className="flex h-10 w-full rounded-md border-2 border-gray-300 dark:border-dark-400 bg-gray-100 dark:bg-dark-500 px-3 py-2 text-sm text-gray-900 dark:text-white">
                {user.role}
              </div>
              <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">Your role is managed by administrators</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-4">
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-4 md:p-6 lg:p-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">Change Password</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            {/* Current Password */}
            <Input
              label="Current Password"
              name="currentPassword"
              type={showCurrentPassword ? "text" : "password"}
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              placeholder="Enter your current password"
              required
              autoComplete="current-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* New Password */}
            <Input
              label="New Password"
              name="newPassword"
              type={showNewPassword ? "text" : "password"}
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              required
              autoComplete="new-password"
              helperText="Must be at least 8 characters"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* Confirm Password */}
            <Input
              label="Confirm New Password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              placeholder="Confirm new password"
              required
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              }
            />

            {/* Actions */}
            <div className="flex items-center justify-end pt-4">
              <Button
                type="submit"
                variant="secondary"
                loading={loading}
                disabled={loading}
              >
                Change Password
              </Button>
            </div>
          </form>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-4 md:p-6 lg:p-8 mt-4 md:mt-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">Notification Preferences</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Choose which notifications you want to receive
          </p>

          {notificationPreferences ? (
            <div className="space-y-6">
              {/* Issue Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Issue Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'issue_assigned', label: 'Issue Assigned to You' },
                    { key: 'issue_updated', label: 'Issue Updates' },
                    { key: 'issue_commented', label: 'New Comments on Issues' },
                    { key: 'issue_status_changed', label: 'Issue Status Changed' },
                    { key: 'issue_priority_changed', label: 'Issue Priority Changed' },
                    { key: 'issue_due_date_changed', label: 'Issue Due Date Changed' },
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{pref.label}</span>
                      <div className="relative inline-block w-11 h-6">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.key] ?? true}
                          onChange={() => handleNotificationToggle(pref.key)}
                          disabled={loadingPreferences}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Comment Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Comment Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'comment_on_issue', label: 'Comments on Your Issues' },
                    { key: 'comment_mention', label: 'Mentioned in Comments' },
                    { key: 'comment_reply', label: 'Replies to Your Comments' },
                    { key: 'mention', label: 'General Mentions' },
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{pref.label}</span>
                      <div className="relative inline-block w-11 h-6">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.key] ?? true}
                          onChange={() => handleNotificationToggle(pref.key)}
                          disabled={loadingPreferences}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sprint Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Sprint Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'sprint_started', label: 'Sprint Started' },
                    { key: 'sprint_completed', label: 'Sprint Completed' },
                    { key: 'sprint_issue_added', label: 'Issue Added to Sprint' },
                    { key: 'sprint_starting_soon', label: 'Sprint Starting Soon' },
                    { key: 'sprint_ending_soon', label: 'Sprint Ending Soon' },
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{pref.label}</span>
                      <div className="relative inline-block w-11 h-6">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.key] ?? true}
                          onChange={() => handleNotificationToggle(pref.key)}
                          disabled={loadingPreferences}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Project Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Project Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'project_invitation', label: 'Project Invitation' },
                    { key: 'project_member_added', label: 'Member Added to Project' },
                    { key: 'project_member_removed', label: 'Member Removed from Project' },
                    { key: 'project_role_changed', label: 'Your Project Role Changed' },
                    { key: 'project_archived', label: 'Project Archived' },
                    { key: 'project_deleted', label: 'Project Deleted' },
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{pref.label}</span>
                      <div className="relative inline-block w-11 h-6">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.key] ?? true}
                          onChange={() => handleNotificationToggle(pref.key)}
                          disabled={loadingPreferences}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Feedback & Changelog Notifications */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Other Notifications
                </h3>
                <div className="space-y-3">
                  {[
                    { key: 'feedback_upvoted', label: 'Feedback Upvoted' },
                    { key: 'feedback_status_changed', label: 'Feedback Status Changed' },
                    { key: 'feedback_commented', label: 'Comments on Feedback' },
                    { key: 'new_changelog', label: 'New Changelog Entries' },
                  ].map((pref) => (
                    <label key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-500 transition-colors cursor-pointer">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{pref.label}</span>
                      <div className="relative inline-block w-11 h-6">
                        <input
                          type="checkbox"
                          checked={notificationPreferences[pref.key] ?? true}
                          onChange={() => handleNotificationToggle(pref.key)}
                          disabled={loadingPreferences}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}
        </div>

        {/* Connected Accounts */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-4 md:p-6 lg:p-8 mt-4 md:mt-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">Connected Accounts</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Connect your accounts to enable additional features
          </p>

          {/* Gmail Email for Google Calendar */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-500 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 18h-2V9.25L12 13 6 9.25V18H4V6h1.2l6.8 4.25L18.8 6H20m0-2H4c-1.11 0-2 .89-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2z"/>
              </svg>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Gmail Email</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  If your account email is not a Gmail address, please save your Gmail here as a secondary email. This is required for calendar invites and other Google integrations.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                value={gmailEmail}
                onChange={(e) => setGmailEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                className="flex-1 dark:bg-dark-600 dark:border-dark-400"
              />
              <Button
                onClick={handleSaveGmailEmail}
                loading={savingGmailEmail}
                disabled={savingGmailEmail}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Google Calendar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-dark-500 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-white dark:bg-dark-400 flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Google Calendar</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {loadingGoogleStatus ? (
                    'Loading...'
                  ) : googleCalendarConnected ? (
                    <span className="text-success-600 dark:text-success-400">Connected - You can create events with Google Meet links and send calendar invites</span>
                  ) : (
                    'Connect to create events with Google Meet links and send calendar invites to attendees'
                  )}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {loadingGoogleStatus ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              ) : googleCalendarConnected ? (
                <Button
                  onClick={handleDisconnectGoogle}
                  loading={disconnectingGoogle}
                  disabled={disconnectingGoogle}
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleConnectGoogle}
                  loading={connectingGoogle}
                  disabled={connectingGoogle}
                  className="w-full sm:w-auto"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-4 md:p-6 lg:p-8 mt-4 md:mt-6">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-4 md:mb-6">Account Information</h2>
          <div className="space-y-4 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-200 dark:border-dark-400 gap-1">
              <span className="text-gray-600 dark:text-gray-400">User ID</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs break-all">{user._id}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-dark-400">
              <span className="text-gray-600 dark:text-gray-400">Account Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                user.isActive
                  ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
              }`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-600 dark:text-gray-400">Member Since</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Admin Settings - Only visible for admins */}
        {user.role === 'admin' && (
          <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-red-200 dark:border-red-900/50 p-4 md:p-6 lg:p-8 mt-4 md:mt-6">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">Admin Settings</h2>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Administrator-only features and tools</p>
              </div>
            </div>

            {/* Database Statistics */}
            <div className="mb-4 md:mb-6">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Database Statistics
              </h3>
              {loadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : dbStats ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                  <div className="bg-gray-50 dark:bg-dark-500 rounded-lg p-3 md:p-4">
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{dbStats.totalDocuments?.toLocaleString() || 0}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Documents</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-500 rounded-lg p-3 md:p-4">
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{dbStats.databaseSize || 'N/A'}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Database Size</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-dark-500 rounded-lg p-3 md:p-4 col-span-2 md:col-span-1">
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{Object.keys(dbStats.collections || {}).length}</p>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Collections</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Unable to load statistics</p>
              )}
            </div>

            {/* Export Database */}
            <div className="border-t border-gray-200 dark:border-dark-400 pt-4 md:pt-6">
              <h3 className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Data Management
              </h3>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 md:p-4 bg-gray-50 dark:bg-dark-500 rounded-lg">
                <div>
                  <p className="font-medium text-sm md:text-base text-gray-900 dark:text-white">Export Database</p>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                    Download a complete backup of all data as JSON
                  </p>
                </div>
                <Button
                  onClick={handleExportDatabase}
                  loading={exportingDatabase}
                  disabled={exportingDatabase}
                  variant="secondary"
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {exportingDatabase ? 'Exporting...' : 'Export'}
                </Button>
              </div>
            </div>

            {/* Collection Details */}
            {dbStats?.collections && Object.keys(dbStats.collections).length > 0 && (
              <div className="border-t border-gray-200 dark:border-dark-400 pt-4 md:pt-6 mt-4 md:mt-6">
                <h3 className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                  Collection Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(dbStats.collections).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-500 rounded text-xs md:text-sm">
                      <span className="text-gray-700 dark:text-gray-300 truncate">{name}</span>
                      <span className="font-medium text-gray-900 dark:text-white ml-2">{(count as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
