'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { projectsAPI, organizationsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Organization } from '@/types/organization';
import { Button, Modal, Input, Textarea, Badge, Breadcrumb, LogoLoader } from '@/components/common';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    organizationId: '',
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const orgDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchOrganizations();
    }
  }, [user]);

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

  const fetchProjects = async () => {
    try {
      // Admin sees all projects, regular users see only their projects
      const response = user?.role === UserRole.ADMIN
        ? await projectsAPI.getAll()
        : await projectsAPI.getMyProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await projectsAPI.create({
        name: formData.name,
        key: formData.key,
        description: formData.description,
        lead: user?._id,
        organizationId: formData.organizationId || undefined,
      });
      toast.success('Project created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', key: '', description: '', organizationId: '' });
      setOrgDropdownOpen(false);
      fetchProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create project';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading projects" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
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
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
          ]}
          className="mb-4 md:mb-6"
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Manage and track all your projects</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 md:py-16">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base md:text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No projects yet</h3>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-6">Get started by creating your first project</p>
            <Button onClick={() => setShowCreateModal(true)}>Create Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-gray-900/20 transition-shadow"
              >
                <div className="p-4 md:p-6">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    {project.logo ? (
                      <img
                        src={project.logo}
                        alt={`${project.name} logo`}
                        className="w-10 h-10 md:w-12 md:h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
                        <span className="text-base md:text-lg font-bold text-primary dark:text-primary-400">{project.key}</span>
                      </div>
                    )}
                    {project.isArchived && (
                      <Badge variant="default">Archived</Badge>
                    )}
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 truncate">{project.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">{project.description}</p>
                  <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{project.members?.length || 0} members</span>
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
                      {typeof project.lead === 'object'
                        ? `${project.lead.firstName} ${project.lead.lastName}`
                        : 'Lead'}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={creating} disabled={creating}>
              Create Project
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Project Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
            required
          />
          <Input
            label="Project Key"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
            placeholder="e.g., PROJ"
            helperText="2-4 uppercase letters that will prefix all issues"
            required
            maxLength={4}
          />
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter project description"
            rows={4}
          />

          {/* Organization Selector */}
          {organizations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization (Optional)
              </label>
              <div className="relative" ref={orgDropdownRef}>
                <button
                  type="button"
                  onClick={() => !creating && setOrgDropdownOpen(!orgDropdownOpen)}
                  disabled={creating}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 border border-gray-300 dark:border-dark-300 rounded-lg bg-white dark:bg-dark-400 text-left transition-all ${
                    creating ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer'
                  }`}
                >
                  {formData.organizationId ? (
                    <>
                      {organizations.find(o => o._id === formData.organizationId)?.logo ? (
                        <img
                          src={organizations.find(o => o._id === formData.organizationId)?.logo}
                          alt=""
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                            {organizations.find(o => o._id === formData.organizationId)?.key.substring(0, 2)}
                          </span>
                        </div>
                      )}
                      <span className="flex-1 text-gray-900 dark:text-gray-100">
                        {organizations.find(o => o._id === formData.organizationId)?.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({organizations.find(o => o._id === formData.organizationId)?.key})
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
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-400 border border-gray-200 dark:border-dark-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {/* No Organization option */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, organizationId: '' });
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        !formData.organizationId
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
                      {!formData.organizationId && (
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
                          setFormData({ ...formData, organizationId: org._id });
                          setOrgDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          formData.organizationId === org._id
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
                        {formData.organizationId === org._id && (
                          <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optionally assign this project to an organization
              </p>
            </div>
          )}
        </form>
      </Modal>
    </DashboardLayout>
  );
}
