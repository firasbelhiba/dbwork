'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Input, Breadcrumb, LogoLoader } from '@/components/common';
import { AffectationTable } from '@/components/affectations/AffectationTable';
import { AffectationFormModal } from '@/components/affectations/AffectationFormModal';
import { affectationsAPI, projectsAPI, usersAPI } from '@/lib/api';
import { Affectation } from '@/types/affectation';
import { Project } from '@/types/project';
import { User, UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function AdminAffectationsPage() {
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAffectation, setEditingAffectation] = useState<Affectation | null>(null);
  const [deletingAffectation, setDeletingAffectation] = useState<Affectation | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [groupByProject, setGroupByProject] = useState(true);

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

    fetchData();
  }, [currentUser, authLoading, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [affectationsRes, projectsRes, usersRes] = await Promise.all([
        affectationsAPI.getAll(),
        projectsAPI.getAll(),
        usersAPI.getAll(),
      ]);
      setAffectations(affectationsRes.data || []);
      setProjects(projectsRes.data || []);
      // usersAPI.getAll returns paginated data with { items, total, ... }
      setUsers(usersRes.data?.items || usersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load affectations');
    } finally {
      setLoading(false);
    }
  };

  const fetchAffectations = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterProject) params.projectId = filterProject;
      if (filterUser) params.userId = filterUser;
      if (filterStatus) params.status = filterStatus;

      const response = await affectationsAPI.getAll(params);
      setAffectations(response.data || []);
    } catch (error) {
      console.error('Error fetching affectations:', error);
      toast.error('Failed to load affectations');
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchAffectations();
    }
  }, [filterProject, filterUser, filterStatus]);

  const handleEdit = (affectation: Affectation) => {
    setEditingAffectation(affectation);
    setShowFormModal(true);
  };

  const handleDelete = async (affectation: Affectation) => {
    setDeletingAffectation(affectation);
  };

  const confirmDelete = async () => {
    if (!deletingAffectation) return;

    try {
      await affectationsAPI.delete(deletingAffectation._id);
      toast.success('Affectation deleted successfully');
      fetchAffectations();
    } catch (error: any) {
      console.error('Error deleting affectation:', error);
      toast.error(error.response?.data?.message || 'Failed to delete affectation');
    } finally {
      setDeletingAffectation(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      await affectationsAPI.syncAll();
      toast.success('All affectations synced successfully');
      fetchAffectations();
    } catch (error: any) {
      console.error('Error syncing affectations:', error);
      toast.error(error.response?.data?.message || 'Failed to sync affectations');
    } finally {
      setSyncing(false);
    }
  };

  const handleCloseModal = () => {
    setShowFormModal(false);
    setEditingAffectation(null);
  };

  const handleSuccess = () => {
    fetchAffectations();
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return null;
  }

  if (loading && affectations.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading affectations" />
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
                label: 'Affectations',
              },
            ]}
            className="mb-6"
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Affectations</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage team member assignments to projects for chargeability tracking
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleSyncAll}
                disabled={syncing}
              >
                {syncing ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync All Hours
                  </>
                )}
              </Button>
              <Button onClick={() => setShowFormModal(true)}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Affectation
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h3>
              {(filterProject || filterUser || filterStatus) && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full">
                  {[filterProject, filterUser, filterStatus].filter(Boolean).length} active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-4">
              {/* Project Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Project
                </label>
                <select
                  value={filterProject}
                  onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg bg-gray-50 dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-400 transition-colors text-sm"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name} ({project.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Team Member
                </label>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg bg-gray-50 dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-400 transition-colors text-sm"
                >
                  <option value="">All Team Members</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-dark-300 rounded-lg bg-gray-50 dark:bg-dark-500 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-dark-400 transition-colors text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex-shrink-0">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  View
                </label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-dark-300 bg-gray-50 dark:bg-dark-500">
                  <button
                    onClick={() => setGroupByProject(true)}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      groupByProject
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-400'
                    }`}
                  >
                    <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Grouped
                  </button>
                  <button
                    onClick={() => setGroupByProject(false)}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      !groupByProject
                        ? 'bg-primary-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-400'
                    }`}
                  >
                    <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Flat
                  </button>
                </div>
              </div>

              {/* Clear Filters */}
              {(filterProject || filterUser || filterStatus) && (
                <div className="flex-shrink-0">
                  <button
                    onClick={() => {
                      setFilterProject('');
                      setFilterUser('');
                      setFilterStatus('');
                    }}
                    className="px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total */}
            <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{affectations.length}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Set(affectations.map(a => typeof a.userId === 'object' ? a.userId._id : a.userId)).size} unique members
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Active */}
            <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {affectations.filter((a) => a.status === 'active').length}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Currently working
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Planned */}
            <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Planned</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {affectations.filter((a) => a.status === 'planned').length}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Upcoming assignments
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white dark:bg-dark-400 rounded-xl shadow-sm border border-gray-200 dark:border-dark-300 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-3xl font-bold text-slate-600 dark:text-slate-400 mt-1">
                    {affectations.filter((a) => a.status === 'completed').length}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Finished assignments
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Affectation Table */}
          <AffectationTable
            affectations={affectations}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRefresh={fetchAffectations}
            groupByProject={groupByProject}
          />

          {/* Info section */}
          <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-primary-800 dark:text-primary-200 font-medium">
                  About Affectations
                </p>
                <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                  Affectations track which team members are assigned to which projects during specific time periods.
                  The actual hours are automatically calculated from time tracking data. Use the "Sync All Hours"
                  button to update all affectations with the latest time entries, or hours are synced automatically
                  every day at 6 AM.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      <AffectationFormModal
        isOpen={showFormModal}
        onClose={handleCloseModal}
        affectation={editingAffectation}
        onSuccess={handleSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingAffectation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingAffectation(null)} />
          <div className="relative bg-white dark:bg-dark-400 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-dark-300 overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Delete Affectation
                  </h3>
                  <p className="text-sm text-red-100">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Affectation Info Card */}
              <div className="bg-gray-50 dark:bg-dark-500 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-4">
                  {/* User */}
                  <div className="flex items-center gap-2">
                    {typeof deletingAffectation.userId === 'object' && deletingAffectation.userId.avatar ? (
                      <img
                        src={deletingAffectation.userId.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700 dark:text-primary-400">
                          {typeof deletingAffectation.userId === 'object'
                            ? deletingAffectation.userId.firstName?.charAt(0)
                            : '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {typeof deletingAffectation.userId === 'object'
                          ? `${deletingAffectation.userId.firstName} ${deletingAffectation.userId.lastName}`
                          : 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {deletingAffectation.role}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>

                  {/* Project */}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {typeof deletingAffectation.projectId === 'object'
                        ? deletingAffectation.projectId.name
                        : 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {typeof deletingAffectation.projectId === 'object'
                        ? deletingAffectation.projectId.key
                        : ''}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-300 text-sm mb-5">
                Are you sure you want to delete this affectation? All associated data including hours tracking will be permanently removed.
              </p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDeletingAffectation(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmDelete}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
