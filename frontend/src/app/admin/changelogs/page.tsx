'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { IChangelog, ChangelogListResponse } from '@/types';
import { changelogsAPI } from '@/lib/api';
import { ChangelogCard, ChangelogFormModal } from '@/components/changelog';
import { Button } from '@/components/common/Button';
import { Breadcrumb, LogoLoader } from '@/components/common';
import { UserRole } from '@/types/user';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function AdminChangelogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [changelogs, setChangelogs] = useState<IChangelog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedChangelog, setSelectedChangelog] = useState<IChangelog | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IChangelog | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Check admin access
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== UserRole.ADMIN) {
      router.push('/dashboard');
      return;
    }

    fetchChangelogs();
  }, [user, authLoading, currentPage, router]);

  const fetchChangelogs = async () => {
    try {
      setLoading(true);
      const response = await changelogsAPI.getAll({ page: currentPage, limit });
      const data: ChangelogListResponse = response.data;
      setChangelogs(data.items);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (error: any) {
      console.error('Error fetching changelogs:', error);
      toast.error('Failed to load changelogs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedChangelog(null);
    setShowFormModal(true);
  };

  const handleEdit = (changelog: IChangelog) => {
    setSelectedChangelog(changelog);
    setShowFormModal(true);
  };

  const handleDeleteClick = (changelog: IChangelog) => {
    setDeleteTarget(changelog);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await changelogsAPI.delete(deleteTarget._id);
      toast.success('Changelog deleted successfully');
      setShowDeleteModal(false);
      setDeleteTarget(null);
      fetchChangelogs();
    } catch (error: any) {
      console.error('Error deleting changelog:', error);
      toast.error(error.response?.data?.message || 'Failed to delete changelog');
    } finally {
      setDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    fetchChangelogs();
  };

  // Show loading while auth is being checked
  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading..." />
        </div>
      </DashboardLayout>
    );
  }

  // Don't render anything if redirecting
  if (!user || user.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Changelogs', href: '/admin/changelogs' },
          ]}
        />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Changelogs</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage application version releases and updates
            </p>
          </div>
          <Button onClick={handleCreate} variant="primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Changelog
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <LogoLoader />
          </div>
        )}

        {/* Changelog List */}
        {!loading && changelogs.length > 0 && (
          <div className="space-y-4">
            {changelogs.map((changelog) => (
              <ChangelogCard
                key={changelog._id}
                changelog={changelog}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && changelogs.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No changelogs
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new changelog.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate} variant="primary">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Changelog
              </Button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-dark-400 pt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing page {currentPage} of {totalPages} ({total} total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <ChangelogFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={handleFormSuccess}
        changelog={selectedChangelog}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={!deleting ? () => setShowDeleteModal(false) : undefined}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-dark-600 rounded-lg shadow-xl max-w-md w-full p-6">
              {/* Icon */}
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Content */}
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete Changelog
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete version <strong>{deleteTarget.version}</strong>?
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-5 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
