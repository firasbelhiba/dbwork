'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { issuesAPI } from '@/lib/api';

export const WorkloadWarningBanner: React.FC = () => {
  const { user } = useAuth();
  const [hasNoTickets, setHasNoTickets] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWorkload = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const response = await issuesAPI.getUserWorkload(user._id);
        const totalInProgress = response.data?.totalInProgress || 0;
        setHasNoTickets(totalInProgress === 0);
      } catch (error) {
        console.error('Error checking workload:', error);
        setHasNoTickets(false);
      } finally {
        setLoading(false);
      }
    };

    checkWorkload();

    // Re-check every 5 minutes
    const interval = setInterval(checkWorkload, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?._id]);

  // Don't show if loading, dismissed, or user has tickets
  if (loading || dismissed || !hasNoTickets || !user) {
    return null;
  }

  return (
    <div className="bg-warning-500 text-warning-900">
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">
            You don't have any tickets in progress. Pick up a task to get started!
          </span>
          <Link
            href="/issues"
            className="text-sm font-semibold underline hover:no-underline"
          >
            Browse tickets
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-warning-600/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
