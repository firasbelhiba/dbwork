'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { issuesAPI } from '@/lib/api';
import { Button } from '@/components/common';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface TimeEntry {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  duration: number;
  source: 'automatic' | 'manual';
  description?: string;
  pausedDuration?: number;
  createdAt: string;
}

interface ActiveTimeEntry {
  id: string;
  userId: string;
  startTime: string;
  lastActivityAt: string;
  isPaused: boolean;
  pausedAt?: string;
  accumulatedPausedTime: number;
}

interface TimeTracking {
  estimatedHours?: number;
  loggedHours: number;
  timeLogs: any[];
  timeEntries: TimeEntry[];
  activeTimeEntry?: ActiveTimeEntry | null;
  totalTimeSpent: number;
}

interface TimeTrackerProps {
  issueId: string;
  timeTracking?: TimeTracking;
  onUpdate?: () => void;
  hasSubIssues?: boolean;
}

// Format seconds to human-readable string
const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
};

// Format seconds to short format (e.g., "2h 30m")
const formatDurationShort = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
};

export function TimeTracker({ issueId, timeTracking, onUpdate, hasSubIssues }: TimeTrackerProps) {
  const { user } = useAuth();
  const [timerStatus, setTimerStatus] = useState<{
    isRunning: boolean;
    isPaused: boolean;
    currentDuration: number;
    startTime?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayTime, setDisplayTime] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [aggregatedTime, setAggregatedTime] = useState<{
    ownTime: number;
    subIssuesTime: number;
    totalTime: number;
  } | null>(null);

  // Fetch timer status
  const fetchTimerStatus = useCallback(async () => {
    try {
      const response = await issuesAPI.getTimerStatus(issueId);
      setTimerStatus(response.data);
      setDisplayTime(response.data.currentDuration || 0);
    } catch (error) {
      console.error('Error fetching timer status:', error);
    }
  }, [issueId]);

  // Fetch aggregated time for parent issues
  const fetchAggregatedTime = useCallback(async () => {
    if (!hasSubIssues) return;
    try {
      const response = await issuesAPI.getAggregatedTime(issueId);
      setAggregatedTime(response.data);
    } catch (error) {
      console.error('Error fetching aggregated time:', error);
    }
  }, [issueId, hasSubIssues]);

  // Initial fetch
  useEffect(() => {
    fetchTimerStatus();
    fetchAggregatedTime();
  }, [fetchTimerStatus, fetchAggregatedTime]);

  // Update display time every second when timer is running
  useEffect(() => {
    if (timerStatus?.isRunning && !timerStatus?.isPaused) {
      const interval = setInterval(() => {
        setDisplayTime((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timerStatus?.isRunning, timerStatus?.isPaused]);

  // Update activity every 5 minutes when timer is running
  useEffect(() => {
    if (timerStatus?.isRunning && !timerStatus?.isPaused) {
      const interval = setInterval(async () => {
        try {
          await issuesAPI.updateActivity(issueId);
        } catch (error) {
          console.error('Error updating activity:', error);
        }
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearInterval(interval);
    }
  }, [issueId, timerStatus?.isRunning, timerStatus?.isPaused]);

  const handleStartTimer = async () => {
    setLoading(true);
    try {
      await issuesAPI.startTimer(issueId);
      toast.success('Timer started');
      await fetchTimerStatus();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      toast.error(error.response?.data?.message || 'Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseTimer = async () => {
    setLoading(true);
    try {
      await issuesAPI.pauseTimer(issueId);
      toast.success('Timer paused');
      await fetchTimerStatus();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error pausing timer:', error);
      toast.error(error.response?.data?.message || 'Failed to pause timer');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeTimer = async () => {
    setLoading(true);
    try {
      await issuesAPI.resumeTimer(issueId);
      toast.success('Timer resumed');
      await fetchTimerStatus();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error resuming timer:', error);
      toast.error(error.response?.data?.message || 'Failed to resume timer');
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalSeconds = hours * 3600 + minutes * 60;

    if (totalSeconds <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    setSubmittingManual(true);
    try {
      await issuesAPI.addManualTimeEntry(issueId, totalSeconds, manualDescription || undefined);
      toast.success('Time entry added');
      setManualHours('');
      setManualMinutes('');
      setManualDescription('');
      setShowManualEntry(false);
      onUpdate?.();
    } catch (error: any) {
      console.error('Error adding manual entry:', error);
      toast.error(error.response?.data?.message || 'Failed to add time entry');
    } finally {
      setSubmittingManual(false);
    }
  };

  const totalTime = timeTracking?.totalTimeSpent || 0;
  const estimatedSeconds = (timeTracking?.estimatedHours || 0) * 3600;

  return (
    <div className="bg-white dark:bg-dark-600 rounded-lg border border-gray-200 dark:border-dark-400 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Time Tracking
      </h3>

      {/* Active Timer Section */}
      {(timerStatus?.isRunning || timerStatus?.isPaused) && (
        <div className={`mb-4 p-3 rounded-lg ${timerStatus.isPaused ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-medium ${timerStatus.isPaused ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
              {timerStatus.isPaused ? 'PAUSED' : 'RUNNING'}
            </span>
            <div className={`flex items-center gap-1 ${timerStatus.isPaused ? '' : 'animate-pulse'}`}>
              <div className={`w-2 h-2 rounded-full ${timerStatus.isPaused ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            </div>
          </div>
          <div className={`text-2xl font-mono font-bold ${timerStatus.isPaused ? 'text-yellow-700 dark:text-yellow-300' : 'text-green-700 dark:text-green-300'}`}>
            {formatDuration(displayTime)}
          </div>
          <div className="flex gap-2 mt-3">
            {timerStatus.isPaused ? (
              <Button
                size="sm"
                onClick={handleResumeTimer}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Resume
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handlePauseTimer}
                disabled={loading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
                Pause
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Start Timer Button (when no timer is running) */}
      {!timerStatus?.isRunning && !timerStatus?.isPaused && (
        <Button
          onClick={handleStartTimer}
          disabled={loading}
          className="w-full mb-4 bg-primary hover:bg-primary-dark text-white"
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Start Timer
        </Button>
      )}

      {/* Time Summary */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">This Issue:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatDurationShort(totalTime)}
          </span>
        </div>
        {timeTracking?.estimatedHours && timeTracking.estimatedHours > 0 && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Estimated:</span>
              <span className="text-gray-900 dark:text-white">
                {timeTracking.estimatedHours}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
              <span className={`${(estimatedSeconds - totalTime) < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                {(estimatedSeconds - totalTime) < 0 ? 'Over by ' : ''}{formatDurationShort(Math.abs(estimatedSeconds - totalTime))}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-dark-400 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  (totalTime / estimatedSeconds) > 1 ? 'bg-red-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.min((totalTime / estimatedSeconds) * 100, 100)}%` }}
              ></div>
            </div>
          </>
        )}
      </div>

      {/* Aggregated Time for Parent Issues */}
      {hasSubIssues && aggregatedTime && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-400">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Aggregated Time (incl. sub-issues)
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Sub-issues:</span>
              <span className="text-gray-900 dark:text-white">
                {formatDurationShort(aggregatedTime.subIssuesTime)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-gray-700 dark:text-gray-300">Total Combined:</span>
              <span className="text-primary dark:text-primary-light">
                {formatDurationShort(aggregatedTime.totalTime)}
              </span>
            </div>
            {/* Aggregated Progress Bar */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-dark-400 rounded-full overflow-hidden">
                <div className="flex h-full">
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${aggregatedTime.totalTime > 0 ? (aggregatedTime.ownTime / aggregatedTime.totalTime) * 100 : 0}%` }}
                    title="This issue"
                  ></div>
                  <div
                    className="bg-blue-400 h-full"
                    style={{ width: `${aggregatedTime.totalTime > 0 ? (aggregatedTime.subIssuesTime / aggregatedTime.totalTime) * 100 : 0}%` }}
                    title="Sub-issues"
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                This issue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Sub-issues
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Manual Time Entry Toggle */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-400">
        <button
          onClick={() => setShowManualEntry(!showManualEntry)}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className={`w-4 h-4 transition-transform ${showManualEntry ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Add manual time entry
        </button>

        {showManualEntry && (
          <form onSubmit={handleAddManualEntry} className="mt-3 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Hours</label>
                <input
                  type="number"
                  min="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white text-sm"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 dark:text-gray-400">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white text-sm"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Description (optional)</label>
              <input
                type="text"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-400 rounded-lg bg-white dark:bg-dark-500 text-gray-900 dark:text-white text-sm"
                placeholder="What did you work on?"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={submittingManual}
              className="w-full"
            >
              {submittingManual ? 'Adding...' : 'Add Time Entry'}
            </Button>
          </form>
        )}
      </div>

      {/* Recent Time Entries */}
      {timeTracking?.timeEntries && timeTracking.timeEntries.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-400">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Recent Entries</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {timeTracking.timeEntries.slice(-5).reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${entry.source === 'automatic' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {entry.description || (entry.source === 'automatic' ? 'Auto-tracked' : 'Manual entry')}
                  </span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDurationShort(entry.duration)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
