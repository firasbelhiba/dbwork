'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity } from '@/types/activity';
import { activitiesAPI } from '@/lib/api';
import { ActivityCard } from './ActivityCard';
import { Button } from '@/components/common/Button';

export const RecentActivityWidget: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await activitiesAPI.getRecent();
      setActivities(response.data);
    } catch (err: any) {
      console.error('Error fetching recent activities:', err);
      setError(err.response?.data?.message || 'Failed to load recent activities');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest actions across all projects</p>
        </div>
        <Link href="/admin/activity">
          <Button variant="outline" size="sm">
            View All
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRecentActivities}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && activities.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
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

      {/* Footer */}
      {!loading && !error && activities.length > 0 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-center">
          <Link
            href="/admin/activity"
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            See all activity →
          </Link>
        </div>
      )}
    </div>
  );
};
