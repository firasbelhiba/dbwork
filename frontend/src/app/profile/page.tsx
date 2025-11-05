'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Input, Breadcrumb } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { usersAPI, authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      });
    }
  }, [user]);

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
      <div className="p-8 max-w-4xl mx-auto">
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
          className="mb-6"
        />
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
        </div>

        {/* Profile Information */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h2>
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
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Change Password</h2>
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

        {/* Account Information */}
        <div className="bg-white dark:bg-dark-600 rounded-lg shadow-sm border border-gray-200 dark:border-dark-400 p-8 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Account Information</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-dark-400">
              <span className="text-gray-600 dark:text-gray-400">User ID</span>
              <span className="text-gray-900 dark:text-white font-mono">{user._id}</span>
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
      </div>
    </DashboardLayout>
  );
}
