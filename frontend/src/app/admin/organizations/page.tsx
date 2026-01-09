'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Badge, Input, Breadcrumb, LogoLoader } from '@/components/common';
import { organizationsAPI } from '@/lib/api';
import { Organization } from '@/types/organization';
import { User, UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils';
import { UserAvatar } from '@/components/common/UserAvatar';
import { UserProfileSidebar } from '@/components/users/UserProfileSidebar';
import { OrganizationFormModal } from '@/components/organizations/OrganizationFormModal';
import { OrganizationMembersModal } from '@/components/organizations/OrganizationMembersModal';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminOrganizationsPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [showProfileSidebar, setShowProfileSidebar] = useState(false);

  const handleAvatarClick = (userObj: any) => {
    if (userObj) {
      setProfileUser(userObj);
      setShowProfileSidebar(true);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.role !== UserRole.ADMIN) {
      toast.error('Access denied. Admin role required.');
      router.push('/dashboard');
      return;
    }

    fetchOrganizations();
  }, [currentUser, authLoading, router, showArchived]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await organizationsAPI.getAll({ isArchived: showArchived });
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedOrganization(null);
    setShowFormModal(true);
  };

  const handleEdit = (org: Organization) => {
    setSelectedOrganization(org);
    setShowFormModal(true);
  };

  const handleManageMembers = (org: Organization) => {
    setSelectedOrganization(org);
    setShowMembersModal(true);
  };

  const handleDelete = async (org: Organization) => {
    if (!confirm(`Are you sure you want to archive "${org.name}"? This will hide it from the list but preserve its data.`)) {
      return;
    }

    try {
      await organizationsAPI.delete(org._id);
      toast.success('Organization archived successfully');
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error archiving organization:', error);
      toast.error(error.response?.data?.message || 'Failed to archive organization');
    }
  };

  const handleRestore = async (org: Organization) => {
    try {
      await organizationsAPI.update(org._id, { isArchived: false });
      toast.success('Organization restored successfully');
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error restoring organization:', error);
      toast.error(error.response?.data?.message || 'Failed to restore organization');
    }
  };

  // Filter organizations
  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.description && org.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  if (currentUser?.role !== UserRole.ADMIN) {
    return null;
  }

  if (loading && organizations.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading organizations" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-auto">
        <div className="p-8">
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
                label: 'Admin',
                href: '/admin',
              },
              {
                label: 'Organizations',
              },
            ]}
            className="mb-6"
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Organizations</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage organizations and their members</p>
            </div>
            <Button onClick={handleCreate}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Organization
            </Button>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 mb-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search organizations by name, key, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                Show Archived
              </label>
            </div>
          </div>

          {/* Organizations Grid */}
          {filteredOrganizations.length === 0 ? (
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-12 text-center">
              <div className="text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-lg font-medium">No organizations found</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first organization to get started'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrganizations.map((org) => (
                <div
                  key={org._id}
                  className={`bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6 ${
                    org.isArchived ? 'opacity-60' : ''
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {org.logo ? (
                        <img
                          src={org.logo}
                          alt={org.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {org.key.substring(0, 2)}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{org.name}</h3>
                        <Badge variant="default">{org.key}</Badge>
                      </div>
                    </div>
                    {org.isArchived && (
                      <Badge variant="warning">Archived</Badge>
                    )}
                  </div>

                  {/* Description */}
                  {org.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {org.description}
                    </p>
                  )}

                  {/* Members */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Members</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {org.members.length}
                      </span>
                    </div>
                    <div className="flex -space-x-2">
                      {org.members.slice(0, 5).map((member, index) => {
                        const memberUser = member.userId as User;
                        return (
                          <div
                            key={index}
                            className="relative cursor-pointer hover:z-10 transition-transform hover:scale-110"
                            onClick={() => handleAvatarClick(memberUser)}
                          >
                            <UserAvatar
                              userId={memberUser._id || (member.userId as string)}
                              avatar={memberUser.avatar}
                              firstName={memberUser.firstName || '?'}
                              lastName={memberUser.lastName || ''}
                              size="sm"
                              className="border-2 border-white dark:border-dark-400"
                            />
                          </div>
                        );
                      })}
                      {org.members.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-300 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 border-2 border-white dark:border-dark-400">
                          +{org.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-200 dark:border-dark-300">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Created {formatDateTime(org.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleManageMembers(org)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                          title="Manage Members"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(org)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {org.isArchived ? (
                          <button
                            onClick={() => handleRestore(org)}
                            className="p-1.5 text-gray-500 hover:text-success-600 dark:text-gray-400 dark:hover:text-success-400 transition-colors"
                            title="Restore"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDelete(org)}
                            className="p-1.5 text-gray-500 hover:text-danger-600 dark:text-gray-400 dark:hover:text-danger-400 transition-colors"
                            title="Archive"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Organizations</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {organizations.length}
              </div>
            </div>
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {organizations.filter((o) => !o.isArchived).length}
              </div>
            </div>
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Members</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {organizations.reduce((sum, org) => sum + org.members.length, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <OrganizationFormModal
        isOpen={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setSelectedOrganization(null);
        }}
        organization={selectedOrganization}
        onSuccess={() => {
          fetchOrganizations();
          setShowFormModal(false);
          setSelectedOrganization(null);
        }}
      />

      <OrganizationMembersModal
        isOpen={showMembersModal}
        onClose={() => {
          setShowMembersModal(false);
          setSelectedOrganization(null);
        }}
        organization={selectedOrganization}
        onSuccess={() => {
          fetchOrganizations();
        }}
      />

      {/* User Profile Sidebar */}
      <UserProfileSidebar
        user={profileUser}
        isOpen={showProfileSidebar}
        onClose={() => {
          setShowProfileSidebar(false);
          setProfileUser(null);
        }}
      />
    </DashboardLayout>
  );
}
