'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, ActivityResponse, ActionType, EntityType } from '@/types/activity';
import { activitiesAPI, projectsAPI, usersAPI } from '@/lib/api';
import { ActivityCard } from '@/components/activities/ActivityCard';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { Input } from '@/components/common/Input';
import { Breadcrumb, LogoLoader } from '@/components/common';
import { UserRole } from '@/types/user';
import { useRouter } from 'next/navigation';

export default function ActivityMonitorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Check admin access
  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === UserRole.ADMIN) {
      fetchActivities();
    }
  }, [user, currentPage, actionFilter, entityTypeFilter, projectFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: 20,
      };

      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (projectFilter) params.projectId = projectFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await activitiesAPI.getAll(params);
      const data: ActivityResponse = response.data;

      setActivities(data.data);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      setError(err.response?.data?.message || 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchActivities();
  };

  const handleClearFilters = () => {
    setActionFilter('');
    setEntityTypeFilter('');
    setProjectFilter('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  if (user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <DashboardLayout>
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
            { label: 'Admin' },
            { label: 'Activity Monitor' },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity Monitor</h1>
          <p className="text-gray-600 mt-1">
            Track all user actions across projects
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <Input
                  type="text"
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action Type
                </label>
                <Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="All actions"
                >
                  <option value="">All actions</option>
                  {Object.values(ActionType).map((action) => (
                    <option key={action} value={action}>
                      {action.replace('_', ' ')}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Entity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Entity Type
                </label>
                <Select
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  placeholder="All entities"
                >
                  <option value="">All entities</option>
                  {Object.values(EntityType).map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Actions */}
              <div className="flex items-end gap-2">
                <Button type="submit" variant="primary" className="flex-1">
                  Apply
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearFilters}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              All Activities
              {total > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({total} total)
                </span>
              )}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <LogoLoader size="md" text="Loading activities" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-sm text-red-800">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchActivities}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {!loading && !error && activities.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-gray-500">No activities found</p>
                {(actionFilter || entityTypeFilter || projectFilter || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-4"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}

            {!loading && !error && activities.length > 0 && (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <ActivityCard key={activity._id} activity={activity} showProject={true} />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && !error && activities.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
