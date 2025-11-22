'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Select, Input, Breadcrumb, LogoLoader } from '@/components/common';
import { FeedbackCard } from '@/components/feedback';
import { feedbackAPI } from '@/lib/api';
import { Feedback, FeedbackType, FeedbackStatus } from '@/types/feedback';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function FeedbackPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchFeedbacks();
    }
  }, [user, currentPage, typeFilter, statusFilter, sortBy, searchQuery]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 20,
        sortBy,
      };

      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const response = await feedbackAPI.getAll(params);
      setFeedbacks(response.data.data);
      setTotalPages(response.data.totalPages);
    } catch (error: any) {
      console.error('Error fetching feedbacks:', error);
      toast.error(error.response?.data?.message || 'Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (id: string) => {
    if (upvotingId) return; // Prevent multiple simultaneous upvotes
    try {
      setUpvotingId(id);
      const response = await feedbackAPI.upvote(id);
      // Update the feedback in the list
      setFeedbacks((prev) =>
        prev.map((f) => (f._id === id ? response.data : f))
      );
      const wasUpvoted = response.data.upvotedBy.some((userId: string) => userId === user?._id);
      toast.success(wasUpvoted ? 'Upvoted!' : 'Upvote removed');
    } catch (error: any) {
      console.error('Error upvoting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to upvote');
    } finally {
      setUpvotingId(null);
    }
  };

  const handleClearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setSortBy('recent');
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
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
              },
            ]}
          />

          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Feedback & Bug Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Report bugs, request features, or suggest improvements
              </p>
            </div>

            <Button onClick={() => router.push('/feedback/new')}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Feedback
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <Select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Types</option>
                <option value={FeedbackType.BUG}>Bug</option>
                <option value={FeedbackType.FEATURE_REQUEST}>Feature Request</option>
                <option value={FeedbackType.IMPROVEMENT}>Improvement</option>
                <option value={FeedbackType.OTHER}>Other</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Status</option>
                <option value={FeedbackStatus.OPEN}>Open</option>
                <option value={FeedbackStatus.TO_TEST}>To Test</option>
                <option value={FeedbackStatus.RESOLVED}>Resolved</option>
                <option value={FeedbackStatus.CLOSED}>Closed</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <Select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="most_upvoted">Most Upvoted</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <Input
                type="text"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {(typeFilter || statusFilter || searchQuery) && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Active filters applied
              </span>
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LogoLoader size="lg" text="Loading feedback..." />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No feedback found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || typeFilter || statusFilter
                ? 'Try adjusting your filters to see more results.'
                : 'Be the first to submit feedback!'}
            </p>
            <Button onClick={() => router.push('/feedback/new')}>
              Submit Feedback
            </Button>
          </div>
        ) : (
          <>
            {/* Feedback Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedbacks.map((feedback) => (
                <FeedbackCard
                  key={feedback._id}
                  feedback={feedback}
                  onUpvote={handleUpvote}
                  currentUserId={user?._id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>

                <span className="text-sm text-gray-600 dark:text-gray-400 px-4">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
