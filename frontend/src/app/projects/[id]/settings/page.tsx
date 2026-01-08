'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { projectsAPI, usersAPI, organizationsAPI } from '@/lib/api';
import { Organization } from '@/types/organization';
import { Project, ProjectMember, ProjectRole } from '@/types/project';
import { User, UserRole } from '@/types/user';
import { Button, Input, Textarea, Select, Badge, Breadcrumb, LogoLoader } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Helper function to get badge variant based on user role
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

// Helper function to get badge variant based on project role
const getProjectRoleBadgeVariant = (role?: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
  switch (role) {
    case 'project_manager':
      return 'warning';
    case 'tech_lead':
      return 'danger';
    case 'frontend':
      return 'primary';
    case 'backend':
      return 'success';
    case 'fullstack':
      return 'primary';
    case 'designer':
      return 'secondary';
    case 'qa':
      return 'default';
    case 'devops':
      return 'success';
    default:
      return 'default';
  }
};

// Project role display names
const PROJECT_ROLE_LABELS: Record<string, string> = {
  project_manager: 'Project Manager',
  tech_lead: 'Tech Lead',
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
  designer: 'Designer',
  qa: 'QA',
  devops: 'DevOps',
  member: 'Member',
};

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'settings'>('general');
  const [unauthorized, setUnauthorized] = useState(false);

  // General settings
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: '',
  });

  // Project settings
  const [projectSettings, setProjectSettings] = useState({
    defaultIssueType: 'task',
    enableTimeTracking: true,
    allowAttachments: true,
    maxAttachmentSize: 10,
  });

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Members management
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Organization assignment
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const orgDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId && currentUser) {
      fetchProjectData();
      fetchUsers();
      fetchOrganizations();
    }
  }, [projectId, currentUser]);

  // Close organization dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjectData = async () => {
    try {
      // Wait for user to be loaded
      if (!currentUser) {
        return;
      }

      const response = await projectsAPI.getById(projectId);
      const projectData = response.data;

      // Check authorization: Admin can access all project settings, non-admin must be a member
      if (currentUser.role !== UserRole.ADMIN) {
        const isMember = projectData.members?.some((member: any) => {
          const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId;
          return memberId === currentUser._id;
        });

        if (!isMember) {
          setUnauthorized(true);
          setLoading(false);
          toast.error('You do not have access to this project settings');
          return;
        }
      }

      setProject(projectData);
      setFormData({
        name: projectData.name,
        description: projectData.description,
        key: projectData.key,
      });
      setProjectSettings(projectData.settings || {
        defaultIssueType: 'task',
        enableTimeTracking: true,
        allowAttachments: true,
        maxAttachmentSize: 10,
      });
      // Set organization ID if project has one
      setSelectedOrganizationId(projectData.organizationId || '');
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll({ limit: 100 });
      // Handle paginated response - items contains the user array
      setAllUsers(response.data.items || response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleSaveOrganization = async () => {
    try {
      setSavingOrganization(true);
      await projectsAPI.update(projectId, {
        organizationId: selectedOrganizationId || null,
      });
      toast.success(selectedOrganizationId ? 'Organization assigned successfully' : 'Organization removed from project');
      fetchProjectData();
    } catch (error: any) {
      console.error('Error updating organization:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update organization';
      toast.error(errorMessage);
    } finally {
      setSavingOrganization(false);
    }
  };

  const handleSaveGeneral = async () => {
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }

    try {
      setSaving(true);
      await projectsAPI.update(projectId, {
        name: formData.name,
        description: formData.description,
      });
      toast.success('Project updated successfully');
      fetchProjectData();
    } catch (error: any) {
      console.error('Error updating project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update project';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await projectsAPI.update(projectId, {
        settings: projectSettings,
      });
      toast.success('Settings updated successfully');
      fetchProjectData();
    } catch (error: any) {
      console.error('Error updating settings:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update settings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    // Validate userId
    if (!userId || userId.trim() === '') {
      toast.error('Invalid user ID. This member may have been deleted from the system.');
      return;
    }

    if (!confirm('Are you sure you want to remove this member from the project?')) {
      return;
    }

    try {
      await projectsAPI.removeMember(projectId, userId);
      toast.success('Member removed successfully');
      fetchProjectData();
    } catch (error: any) {
      console.error('[handleRemoveMember] Error removing member:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove member';
      toast.error(errorMessage);
    }
  };

  const handleArchiveProject = async () => {
    if (!confirm('Are you sure you want to archive this project? It can be restored later.')) {
      return;
    }

    try {
      await projectsAPI.archive(projectId);
      toast.success('Project archived successfully');
      router.push('/projects');
    } catch (error: any) {
      console.error('Error archiving project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to archive project';
      toast.error(errorMessage);
    }
  };

  const handleDeleteProject = async () => {
    const confirmation = prompt('Type "DELETE" to confirm project deletion:');
    if (confirmation !== 'DELETE') {
      return;
    }

    try {
      await projectsAPI.delete(projectId);
      toast.success('Project deleted successfully');
      router.push('/projects');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete project';
      toast.error(errorMessage);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPEG, PNG, GIF, WebP, or SVG)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      await projectsAPI.uploadLogo(projectId, file);
      toast.success('Project logo updated successfully');
      fetchProjectData();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      const errorMessage = error.response?.data?.message || 'Failed to upload logo';
      toast.error(errorMessage);
    } finally {
      setUploadingLogo(false);
      // Reset the input
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the project logo?')) {
      return;
    }

    setUploadingLogo(true);
    try {
      await projectsAPI.removeLogo(projectId);
      toast.success('Project logo removed successfully');
      fetchProjectData();
    } catch (error: any) {
      console.error('Error removing logo:', error);
      const errorMessage = error.response?.data?.message || 'Failed to remove logo';
      toast.error(errorMessage);
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading settings" />
        </div>
      </DashboardLayout>
    );
  }

  if (unauthorized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to access this project's settings.</p>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project not found</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">The project you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </div>
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
                label: 'Projects',
                href: '/projects',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
              },
              {
                label: project.name,
                href: `/projects/${project._id}`,
              },
              {
                label: 'Settings',
              },
            ]}
            className="mb-6"
          />

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Project Settings</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage project configuration and members</p>
              </div>
              <Link href={`/projects/${projectId}`}>
                <Button variant="outline">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Project
                </Button>
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-dark-300 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'general'
                    ? 'border-primary text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'members'
                    ? 'border-primary text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Members ({project.members?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'settings'
                    ? 'border-primary text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Project Logo */}
              <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Logo</h2>
                <div className="flex items-start gap-6">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {project.logo ? (
                      <img
                        src={project.logo}
                        alt={`${project.name} logo`}
                        className="w-24 h-24 rounded-lg object-cover border border-gray-200 dark:border-dark-300"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-3xl font-bold">
                        {project.key?.substring(0, 2).toUpperCase() || project.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Upload a logo for your project. This will be displayed in project lists and headers.
                      <br />
                      <span className="text-xs">Recommended: Square image, at least 200x200px. Max 5MB.</span>
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <Button
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        {uploadingLogo ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {project.logo ? 'Change Logo' : 'Upload Logo'}
                          </>
                        )}
                      </Button>
                      {project.logo && (
                        <Button
                          variant="danger"
                          onClick={handleRemoveLogo}
                          disabled={uploadingLogo}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove Logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* General Info */}
              <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Name <span className="text-danger-500">*</span>
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter project name"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Project Key
                    </label>
                    <Input value={formData.key} disabled />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Project key cannot be changed after creation
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter project description"
                      rows={4}
                      disabled={saving}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveGeneral} loading={saving} disabled={saving}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-danger-200 dark:border-danger-800 p-6">
                <h2 className="text-lg font-semibold text-danger-600 dark:text-danger-400 mb-4">Danger Zone</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Archive Project</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Archive this project to hide it from the active projects list
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleArchiveProject}>
                      Archive
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Project</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Permanently delete this project and all its data. This action cannot be undone.
                      </p>
                    </div>
                    <Button variant="danger" onClick={handleDeleteProject}>
                      Delete Project
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300">
                <div className="p-6 border-b border-gray-200 dark:border-dark-300">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Project Members</h2>
                    <Button onClick={() => setShowAddMemberModal(true)}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Member
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-dark-300">
                  {project.members && project.members.length > 0 ? (
                    <>
                      {project.members.map((member: ProjectMember) => {
                        const memberUser = typeof member.userId === 'object' ? member.userId : null;

                        // Skip null members (deleted users)
                        if (!memberUser) {
                          return null;
                        }

                        return (
                          <MemberRow
                            key={memberUser._id}
                            member={member}
                            memberUser={memberUser}
                            projectId={projectId}
                            onRemove={() => handleRemoveMember(memberUser._id)}
                            onRoleChange={fetchProjectData}
                          />
                        );
                      })}
                    </>
                  ) : (
                    <div className="p-12 text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">No members yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Organization Assignment - Admin only */}
              {currentUser?.role === UserRole.ADMIN && (
                <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Organization</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assign this project to an organization</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Select Organization
                      </label>
                      {/* Custom dropdown with organization logos */}
                      <div className="relative" ref={orgDropdownRef}>
                        <button
                          type="button"
                          onClick={() => !savingOrganization && setOrgDropdownOpen(!orgDropdownOpen)}
                          disabled={savingOrganization}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-400 text-left transition-all ${
                            savingOrganization ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer'
                          }`}
                        >
                          {selectedOrganizationId ? (
                            <>
                              {organizations.find(o => o._id === selectedOrganizationId)?.logo ? (
                                <img
                                  src={organizations.find(o => o._id === selectedOrganizationId)?.logo}
                                  alt=""
                                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                                    {organizations.find(o => o._id === selectedOrganizationId)?.key.substring(0, 2)}
                                  </span>
                                </div>
                              )}
                              <span className="flex-1 text-gray-900 dark:text-gray-100">
                                {organizations.find(o => o._id === selectedOrganizationId)?.name}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({organizations.find(o => o._id === selectedOrganizationId)?.key})
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-dark-300 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <span className="flex-1 text-gray-500 dark:text-gray-400">No Organization</span>
                            </>
                          )}
                          <svg className={`w-5 h-5 text-gray-400 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Dropdown menu */}
                        {orgDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {/* No Organization option */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrganizationId('');
                                setOrgDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                !selectedOrganizationId
                                  ? 'bg-primary-50 dark:bg-primary-900/20'
                                  : 'hover:bg-gray-50 dark:hover:bg-dark-300'
                              }`}
                            >
                              <div className="w-6 h-6 rounded bg-gray-100 dark:bg-dark-300 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                              <span className="flex-1 text-gray-600 dark:text-gray-400">No Organization</span>
                              {!selectedOrganizationId && (
                                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>

                            {/* Organization options */}
                            {organizations.map((org) => (
                              <button
                                key={org._id}
                                type="button"
                                onClick={() => {
                                  setSelectedOrganizationId(org._id);
                                  setOrgDropdownOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                  selectedOrganizationId === org._id
                                    ? 'bg-primary-50 dark:bg-primary-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-dark-300'
                                }`}
                              >
                                {org.logo ? (
                                  <img
                                    src={org.logo}
                                    alt=""
                                    className="w-6 h-6 rounded object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                                      {org.key.substring(0, 2)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {org.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {org.key}
                                  </p>
                                </div>
                                {selectedOrganizationId === org._id && (
                                  <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}

                            {organizations.length === 0 && (
                              <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No organizations available
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {organizations.length === 0
                          ? 'No organizations available. Create one in Admin Settings.'
                          : 'Choose an organization to group this project under.'}
                      </p>
                    </div>

                    {/* Current organization display */}
                    {selectedOrganizationId && (
                      <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          {organizations.find(o => o._id === selectedOrganizationId)?.logo ? (
                            <img
                              src={organizations.find(o => o._id === selectedOrganizationId)?.logo}
                              alt="Organization logo"
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                                {organizations.find(o => o._id === selectedOrganizationId)?.key.substring(0, 2)}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {organizations.find(o => o._id === selectedOrganizationId)?.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {organizations.find(o => o._id === selectedOrganizationId)?.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveOrganization}
                        loading={savingOrganization}
                        disabled={savingOrganization}
                      >
                        {selectedOrganizationId ? 'Save Organization' : 'Remove Organization'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Issue Type
                    </label>
                    <Select
                      value={projectSettings.defaultIssueType}
                      onChange={(e) => setProjectSettings({ ...projectSettings, defaultIssueType: e.target.value })}
                      disabled={saving}
                    >
                      <option value="task">Task</option>
                      <option value="bug">Bug</option>
                      <option value="story">Story</option>
                      <option value="epic">Epic</option>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-300 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Enable Time Tracking</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Allow time logging on issues</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={projectSettings.enableTimeTracking}
                        onChange={(e) => setProjectSettings({ ...projectSettings, enableTimeTracking: e.target.checked })}
                        className="sr-only peer"
                        disabled={saving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-300 rounded-lg">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Allow Attachments</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enable file attachments on issues</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={projectSettings.allowAttachments}
                        onChange={(e) => setProjectSettings({ ...projectSettings, allowAttachments: e.target.checked })}
                        className="sr-only peer"
                        disabled={saving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  {projectSettings.allowAttachments && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Attachment Size (MB)
                      </label>
                      <Input
                        type="number"
                        value={projectSettings.maxAttachmentSize}
                        onChange={(e) => setProjectSettings({ ...projectSettings, maxAttachmentSize: Number(e.target.value) })}
                        min="1"
                        max="100"
                        disabled={saving}
                      />
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} loading={saving} disabled={saving}>
                      Save Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <AddMemberModal
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)}
          projectId={projectId}
          allUsers={allUsers}
          currentMembers={project.members || []}
          onSuccess={() => {
            fetchProjectData();
            setShowAddMemberModal(false);
          }}
        />
      )}
    </DashboardLayout>
  );
}

// All available project roles
const ALL_PROJECT_ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'fullstack', label: 'Fullstack' },
  { value: 'designer', label: 'Designer' },
  { value: 'qa', label: 'QA' },
  { value: 'devops', label: 'DevOps' },
  { value: 'member', label: 'Member' },
];

// MemberRow component with multi-select roles
function MemberRow({ member, memberUser, projectId, onRemove, onRoleChange }: {
  member: ProjectMember;
  memberUser: User;
  projectId: string;
  onRemove: () => void;
  onRoleChange: () => void;
}) {
  const [updatingRoles, setUpdatingRoles] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  // Handle both old single role and new array format
  const currentRoles: string[] = member.projectRoles && member.projectRoles.length > 0
    ? member.projectRoles
    : (member as any).projectRole
      ? [(member as any).projectRole]
      : ['member'];

  const handleRoleToggle = async (role: string) => {
    let newRoles: string[];

    if (currentRoles.includes(role)) {
      // Remove role if already selected (but keep at least one)
      if (currentRoles.length > 1) {
        newRoles = currentRoles.filter(r => r !== role);
      } else {
        return; // Can't remove the last role
      }
    } else {
      // Add role
      newRoles = [...currentRoles, role];
    }

    try {
      setUpdatingRoles(true);
      await projectsAPI.updateMemberRoles(projectId, memberUser._id, newRoles);
      toast.success('Roles updated successfully');
      onRoleChange();
    } catch (error: any) {
      console.error('Error updating roles:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update roles';
      toast.error(errorMessage);
    } finally {
      setUpdatingRoles(false);
    }
  };

  return (
    <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-300/50 transition-colors">
      <div className="flex items-center flex-1 min-w-0">
        {memberUser.avatar ? (
          <img
            src={memberUser.avatar}
            alt={`${memberUser.firstName} ${memberUser.lastName}`}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            {getInitials(memberUser.firstName, memberUser.lastName)}
          </div>
        )}
        <div className="ml-3 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {memberUser.firstName} {memberUser.lastName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{memberUser.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {/* Project Roles - Multi-select dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            disabled={updatingRoles}
            className="flex items-center gap-1 text-sm px-3 py-1.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-400 text-gray-900 dark:text-gray-100 hover:border-primary-400 dark:hover:border-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {currentRoles.map(role => (
                <Badge key={role} variant={getProjectRoleBadgeVariant(role)} className="text-xs">
                  {PROJECT_ROLE_LABELS[role] || role}
                </Badge>
              ))}
            </div>
            {updatingRoles ? (
              <svg className="w-4 h-4 ml-1 animate-spin text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-1 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Dropdown menu */}
          {showRoleDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowRoleDropdown(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-dark-400 rounded-lg shadow-lg border border-gray-200 dark:border-dark-300 z-20 py-1">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-300">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Select roles (click to toggle)</p>
                </div>
                {ALL_PROJECT_ROLES.map(role => (
                  <button
                    key={role.value}
                    onClick={() => handleRoleToggle(role.value)}
                    disabled={updatingRoles || (currentRoles.length === 1 && currentRoles.includes(role.value))}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-gray-900 dark:text-gray-100">{role.label}</span>
                    {currentRoles.includes(role.value) && (
                      <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {/* Remove button */}
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors"
          title="Remove member"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function AddMemberModal({ isOpen, onClose, projectId, allUsers, currentMembers, onSuccess }: any) {
  const [adding, setAdding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['member']);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Filter out users who are already members
  const availableUsers = allUsers.filter((user: User) => {
    const isMember = currentMembers.some((member: ProjectMember) => {
      const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId;
      return memberId === user._id;
    });
    const matchesSearch = searchTerm === '' ||
      `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchTerm.toLowerCase());
    return !isMember && matchesSearch;
  });

  const selectedUser = availableUsers.find((u: User) => u._id === selectedUserId);

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        // Remove role if already selected (but keep at least one)
        if (prev.length > 1) {
          return prev.filter(r => r !== role);
        }
        return prev;
      } else {
        // Add role
        return [...prev, role];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    if (selectedRoles.length === 0) {
      toast.error('Please select at least one role');
      return;
    }

    try {
      setAdding(true);
      await projectsAPI.addMember(projectId, {
        userId: selectedUserId,
        projectRoles: selectedRoles,
      });
      toast.success('Member added successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error adding member:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add member';
      toast.error(errorMessage);
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with animation */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-dark-400 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-dark-300 transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add Team Member</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Invite a user to collaborate on this project</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={adding}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search and Select User <span className="text-danger-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-400 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                disabled={adding}
              />
            </div>
          </div>

          {/* User List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Users ({availableUsers.length})
            </label>
            <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-dark-300 rounded-lg divide-y divide-gray-200 dark:divide-dark-300">
              {availableUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No users found matching your search' : 'All users are already members'}
                  </p>
                </div>
              ) : (
                availableUsers.map((user: User) => (
                  <label
                    key={user._id}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                      selectedUserId === user._id
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-dark-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedUser"
                      value={user._id}
                      checked={selectedUserId === user._id}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      disabled={adding}
                    />
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {getInitials(user.firstName, user.lastName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                          {user.role.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Project Roles Selection - Multi-select */}
          {selectedUserId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project Roles <span className="text-danger-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  disabled={adding}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-400 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all disabled:opacity-50"
                >
                  <div className="flex flex-wrap gap-1">
                    {selectedRoles.map(role => (
                      <Badge key={role} variant={getProjectRoleBadgeVariant(role)} className="text-xs">
                        {PROJECT_ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${showRoleDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {showRoleDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowRoleDropdown(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-dark-400 rounded-lg shadow-lg border border-gray-200 dark:border-dark-300 z-20 py-1 max-h-48 overflow-y-auto">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-dark-300">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Select one or more roles</p>
                      </div>
                      {ALL_PROJECT_ROLES.map(role => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => handleRoleToggle(role.value)}
                          disabled={adding || (selectedRoles.length === 1 && selectedRoles.includes(role.value))}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-300 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-gray-900 dark:text-gray-100">{role.label}</span>
                          {selectedRoles.includes(role.value) && (
                            <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                These roles define their function within this project only. You can assign multiple roles.
              </p>
            </div>
          )}

          {/* Selected User Preview */}
          {selectedUser && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
              <div className="flex items-center gap-3">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-base font-semibold">
                    {getInitials(selectedUser.firstName, selectedUser.lastName)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedRoles.map(role => (
                      <Badge key={role} variant={getProjectRoleBadgeVariant(role)} className="text-xs">
                        {PROJECT_ROLE_LABELS[role] || role}
                      </Badge>
                    ))}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      project {selectedRoles.length === 1 ? 'role' : 'roles'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-300">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              User will keep their existing permissions
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={adding}>
                Cancel
              </Button>
              <Button type="submit" loading={adding} disabled={adding || !selectedUserId}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Member
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
