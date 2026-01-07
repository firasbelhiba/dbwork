'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/common/Modal';
import { Button, Input, Select, Badge } from '@/components/common';
import { UserAvatar } from '@/components/common/UserAvatar';
import { organizationsAPI, usersAPI } from '@/lib/api';
import { Organization, OrganizationMember } from '@/types/organization';
import { User, UserRole } from '@/types/user';
import toast from 'react-hot-toast';

interface OrganizationMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: Organization | null;
  onSuccess: () => void;
}

export function OrganizationMembersModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
}: OrganizationMembersModalProps) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.DEVELOPER);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await usersAPI.search(query);
      // Filter out users who are already members
      const memberIds = organization?.members.map((m) => {
        const user = m.userId as User;
        return user._id || (m.userId as string);
      }) || [];
      const filtered = (response.data || []).filter(
        (user: User) => !memberIds.includes(user._id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (user: User) => {
    if (!organization) return;

    try {
      setLoading(true);
      await organizationsAPI.addMember(organization._id, {
        userId: user._id,
        role: selectedRole,
      });
      toast.success(`${user.firstName} ${user.lastName} added to organization`);
      setSearchQuery('');
      setSearchResults([]);
      onSuccess();
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    if (!organization) return;

    const memberUser = member.userId as User;
    const userId = memberUser._id || (member.userId as string);
    const memberName = memberUser.firstName
      ? `${memberUser.firstName} ${memberUser.lastName}`
      : 'this member';

    if (!confirm(`Are you sure you want to remove ${memberName} from the organization?`)) {
      return;
    }

    try {
      setUpdatingMember(userId);
      await organizationsAPI.removeMember(organization._id, userId);
      toast.success('Member removed successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleUpdateRole = async (member: OrganizationMember, newRole: UserRole) => {
    if (!organization) return;

    const memberUser = member.userId as User;
    const userId = memberUser._id || (member.userId as string);

    try {
      setUpdatingMember(userId);
      await organizationsAPI.updateMemberRole(organization._id, userId, newRole);
      toast.success('Member role updated');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingMember(null);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'danger';
      case UserRole.PROJECT_MANAGER:
        return 'warning';
      case UserRole.DEVELOPER:
        return 'primary';
      case UserRole.VIEWER:
        return 'default';
      default:
        return 'default';
    }
  };

  if (!organization) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manage Members - ${organization.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Add Member Section */}
        <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Add New Member
          </h4>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search users by name or email..."
                leftIcon={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => handleAddMember(user)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors text-left"
                    >
                      <UserAvatar
                        userId={user._id}
                        avatar={user.avatar}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.replace(/_/g, ' ')}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
              {searching && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                  Searching...
                </div>
              )}
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                  No users found
                </div>
              )}
            </div>
            <div className="w-40">
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              >
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                <option value={UserRole.DEVELOPER}>Developer</option>
                <option value={UserRole.VIEWER}>Viewer</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Current Members ({organization.members.length})
          </h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {organization.members.map((member, index) => {
              const memberUser = member.userId as User;
              const userId = memberUser._id || (member.userId as string);
              const isCreator = organization.creator === userId ||
                (organization.creator as any)?._id === userId;
              const isUpdating = updatingMember === userId;

              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      userId={userId}
                      avatar={memberUser.avatar}
                      firstName={memberUser.firstName || '?'}
                      lastName={memberUser.lastName || ''}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {memberUser.firstName} {memberUser.lastName}
                        </p>
                        {isCreator && (
                          <Badge variant="primary">Creator</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {memberUser.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member, e.target.value as UserRole)}
                      disabled={isUpdating}
                      className="w-36 text-sm"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.PROJECT_MANAGER}>Project Manager</option>
                      <option value={UserRole.DEVELOPER}>Developer</option>
                      <option value={UserRole.VIEWER}>Viewer</option>
                    </Select>
                    {!isCreator && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={isUpdating}
                        className="p-2 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {organization.members.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No members yet. Add members using the search above.
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-300">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
