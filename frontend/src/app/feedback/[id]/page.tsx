'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Breadcrumb, LogoLoader } from '@/components/common';
import { CommentSection } from '@/components/feedback/CommentSection';
import { feedbackAPI } from '@/lib/api';
import { Feedback, FeedbackType, FeedbackStatus } from '@/types/feedback';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import toast from 'react-hot-toast';

export default function FeedbackDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchFeedback();
    }
  }, [params.id]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackAPI.getById(params.id as string);
      setFeedback(response.data);
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to load feedback');
      router.push('/feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (!feedback) return;
    try {
      const response = await feedbackAPI.upvote(feedback._id);
      setFeedback(response.data);
    } catch (error: any) {
      console.error('Error upvoting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to upvote');
    }
  };

  const handleResolve = async () => {
    if (!feedback) return;
    try {
      setActionLoading(true);
      const response = await feedbackAPI.resolve(feedback._id);
      setFeedback(response.data);
      toast.success('Feedback marked as resolved');
    } catch (error: any) {
      console.error('Error resolving feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to resolve feedback');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (!feedback) return;
    try {
      setActionLoading(true);
      const response = await feedbackAPI.reopen(feedback._id);
      setFeedback(response.data);
      toast.success('Feedback reopened');
    } catch (error: any) {
      console.error('Error reopening feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to reopen feedback');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToTest = async () => {
    if (!feedback) return;
    try {
      setActionLoading(true);
      const response = await feedbackAPI.toTest(feedback._id);
      setFeedback(response.data);
      toast.success('Feedback marked as to test');
    } catch (error: any) {
      console.error('Error marking feedback as to test:', error);
      toast.error(error.response?.data?.message || 'Failed to mark feedback as to test');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!feedback) return;
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      setActionLoading(true);
      await feedbackAPI.delete(feedback._id);
      toast.success('Feedback deleted successfully');
      router.push('/feedback');
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to delete feedback');
      setActionLoading(false);
    }
  };

  const getTypeEmoji = (type: FeedbackType) => {
    switch (type) {
      case FeedbackType.BUG:
        return '🐛';
      case FeedbackType.FEATURE_REQUEST:
        return '✨';
      case FeedbackType.IMPROVEMENT:
        return '💡';
      case FeedbackType.OTHER:
        return '💬';
      default:
        return '📝';
    }
  };

  const getTypeLabel = (type: FeedbackType) => {
    switch (type) {
      case FeedbackType.BUG:
        return 'Bug';
      case FeedbackType.FEATURE_REQUEST:
        return 'Feature Request';
      case FeedbackType.IMPROVEMENT:
        return 'Improvement';
      case FeedbackType.OTHER:
        return 'Other';
      default:
        return type;
    }
  };

  const getStatusColor = (status: FeedbackStatus) => {
    switch (status) {
      case FeedbackStatus.OPEN:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case FeedbackStatus.TO_TEST:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case FeedbackStatus.RESOLVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LogoLoader size="lg" text="Loading feedback..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!feedback) {
    return null;
  }

  const isOwner = user?._id === (typeof feedback.userId === 'object' ? feedback.userId._id : feedback.userId);
  const isAdmin = user?.role === UserRole.ADMIN;
  const hasUpvoted = feedback.upvotedBy.includes(user?._id || '');

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
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
                label: 'Feedback',
                href: '/feedback',
              },
              {
                label: feedback.title,
              },
            ]}
          />
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{getTypeEmoji(feedback.type)}</span>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {getTypeLabel(feedback.type)}
                </span>
                <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(feedback.status)}`}>
                  {feedback.status === FeedbackStatus.OPEN ? 'Open' : feedback.status === FeedbackStatus.TO_TEST ? 'To Test' : 'Resolved'}
                </span>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {feedback.title}
              </h1>

              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  {typeof feedback.userId === 'object' && feedback.userId.avatar ? (
                    <img
                      src={feedback.userId.avatar}
                      alt={`${feedback.userId.firstName} ${feedback.userId.lastName}`}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center text-white text-xs font-medium">
                      {typeof feedback.userId === 'object'
                        ? `${feedback.userId.firstName[0]}${feedback.userId.lastName[0]}`
                        : '?'}
                    </div>
                  )}
                  <span>
                    {typeof feedback.userId === 'object'
                      ? `${feedback.userId.firstName} ${feedback.userId.lastName}`
                      : 'Unknown User'}
                  </span>
                </div>
                <span>•</span>
                <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Upvote Button */}
            <button
              onClick={handleUpvote}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg border-2 transition-all ${
                hasUpvoted
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 text-gray-600 dark:text-gray-400'
              }`}
            >
              <svg
                className="w-5 h-5"
                fill={hasUpvoted ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              <span className="text-lg font-semibold">{feedback.upvotes}</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Description
          </h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {feedback.description}
          </p>
        </div>

        {/* Additional Information */}
        {(feedback.pageUrl || feedback.browserInfo) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Additional Information
            </h2>
            <div className="space-y-3">
              {feedback.pageUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Page URL
                  </label>
                  <a
                    href={feedback.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:underline break-all"
                  >
                    {feedback.pageUrl}
                  </a>
                </div>
              )}
              {feedback.browserInfo && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Browser Information
                  </label>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    {feedback.browserInfo}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resolved Information */}
        {feedback.status === FeedbackStatus.RESOLVED && feedback.resolvedBy && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Resolved
                </h3>
                <p className="text-sm text-green-800 dark:text-green-300">
                  This feedback was marked as resolved by{' '}
                  <span className="font-medium">
                    {typeof feedback.resolvedBy === 'object'
                      ? `${feedback.resolvedBy.firstName} ${feedback.resolvedBy.lastName}`
                      : 'Admin'}
                  </span>
                  {feedback.resolvedAt && (
                    <span> on {new Date(feedback.resolvedAt).toLocaleDateString()}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push('/feedback')}>
            Back to Feedback
          </Button>

          <div className="flex items-center gap-3">
            {/* Owner Actions */}
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/feedback/${feedback._id}/edit`)}
                  disabled={actionLoading}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {actionLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}

            {/* Admin Actions */}
            {isAdmin && (
              <>
                {feedback.status === FeedbackStatus.OPEN && (
                  <>
                    <Button variant="outline" onClick={handleToTest} disabled={actionLoading}>
                      {actionLoading ? 'Marking as To Test...' : 'To Test'}
                    </Button>
                    <Button onClick={handleResolve} disabled={actionLoading}>
                      {actionLoading ? 'Resolving...' : 'Mark as Resolved'}
                    </Button>
                  </>
                )}
                {feedback.status === FeedbackStatus.TO_TEST && (
                  <>
                    <Button variant="outline" onClick={handleReopen} disabled={actionLoading}>
                      {actionLoading ? 'Reopening...' : 'Reopen'}
                    </Button>
                    <Button onClick={handleResolve} disabled={actionLoading}>
                      {actionLoading ? 'Resolving...' : 'Mark as Resolved'}
                    </Button>
                  </>
                )}
                {feedback.status === FeedbackStatus.RESOLVED && (
                  <Button variant="outline" onClick={handleReopen} disabled={actionLoading}>
                    {actionLoading ? 'Reopening...' : 'Reopen'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white dark:bg-dark-400 rounded-lg shadow p-6 border border-gray-200 dark:border-dark-300">
          <CommentSection feedbackId={params.id as string} />
        </div>
      </div>
    </DashboardLayout>
  );
}
