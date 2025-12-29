'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { issuesAPI } from '@/lib/api';

interface OvertimeTicket {
  _id: string;
  key: string;
  title: string;
  loggedHours: number;
}

// Format hours in a human-readable way (e.g., "48 hours and 19 minutes")
const formatHours = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  if (m === 0) {
    return `${h} hour${h !== 1 ? 's' : ''}`;
  }
  return `${h} hour${h !== 1 ? 's' : ''} and ${m} minute${m !== 1 ? 's' : ''}`;
};

export const WorkloadWarningBanner: React.FC = () => {
  const { user } = useAuth();
  const [hasNoTickets, setHasNoTickets] = useState(false);
  const [overtimeTickets, setOvertimeTickets] = useState<OvertimeTicket[]>([]);
  const [dismissedNoTickets, setDismissedNoTickets] = useState(false);
  const [dismissedOvertime, setDismissedOvertime] = useState<string[]>([]);
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
        setOvertimeTickets(response.data?.overtimeTickets || []);
      } catch (error) {
        console.error('Error checking workload:', error);
        setHasNoTickets(false);
        setOvertimeTickets([]);
      } finally {
        setLoading(false);
      }
    };

    checkWorkload();

    // Re-check every 5 minutes
    const interval = setInterval(checkWorkload, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?._id]);

  // Don't show anything if not logged in or still loading
  if (!user || loading) {
    return null;
  }

  // Filter out dismissed overtime tickets
  const visibleOvertimeTickets = overtimeTickets.filter(
    (t) => !dismissedOvertime.includes(t._id)
  );

  const showNoTicketsBanner = hasNoTickets && !dismissedNoTickets;
  const showOvertimeBanner = visibleOvertimeTickets.length > 0;

  if (!showNoTicketsBanner && !showOvertimeBanner) {
    return null;
  }

  return (
    <div className="flex flex-col">
      {/* No tickets warning */}
      {showNoTicketsBanner && (
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
              onClick={() => setDismissedNoTickets(true)}
              className="p-1 hover:bg-warning-600/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Overtime tickets warning */}
      {showOvertimeBanner && (
        <div className="bg-danger-500 text-white">
          <div className="px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">
                {visibleOvertimeTickets.length === 1 ? (
                  <>
                    Ticket{' '}
                    <Link
                      href={`/issues/${visibleOvertimeTickets[0].key}`}
                      className="font-bold underline hover:no-underline"
                    >
                      {visibleOvertimeTickets[0].key}
                    </Link>{' '}
                    has exceeded 10 hours ({formatHours(visibleOvertimeTickets[0].loggedHours)} logged).
                    Consider breaking it into smaller tasks or reviewing the scope.
                  </>
                ) : (
                  <>
                    {visibleOvertimeTickets.length} tickets have exceeded 10 hours:{' '}
                    {visibleOvertimeTickets.slice(0, 3).map((t, i) => (
                      <span key={t._id}>
                        <Link
                          href={`/issues/${t.key}`}
                          className="font-bold underline hover:no-underline"
                        >
                          {t.key}
                        </Link>
                        {' '}({formatHours(t.loggedHours)})
                        {i < Math.min(visibleOvertimeTickets.length - 1, 2) ? ', ' : ''}
                      </span>
                    ))}
                    {visibleOvertimeTickets.length > 3 && (
                      <span> and {visibleOvertimeTickets.length - 3} more</span>
                    )}
                  </>
                )}
              </span>
            </div>
            <button
              onClick={() => setDismissedOvertime(visibleOvertimeTickets.map((t) => t._id))}
              className="p-1 hover:bg-danger-600/20 rounded transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
