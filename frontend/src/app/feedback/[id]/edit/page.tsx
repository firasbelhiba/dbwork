'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Select, Input, Breadcrumb, LogoLoader } from '@/components/common';
import { feedbackAPI } from '@/lib/api';
import { Feedback, FeedbackType } from '@/types/feedback';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function EditFeedbackPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: FeedbackType.BUG,
    title: '',
    description: '',
    pageUrl: '',
    browserInfo: '',
  });

  useEffect(() => {
    if (params.id) {
      fetchFeedback();
    }
  }, [params.id]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackAPI.getById(params.id as string);
      const feedback: Feedback = response.data;

      // Check if user is the owner
      const isOwner = user?._id === (typeof feedback.userId === 'object' ? feedback.userId._id : feedback.userId);
      if (!isOwner) {
        toast.error('You are not authorized to edit this feedback');
        router.push(`/feedback/${params.id}`);
        return;
      }

      // Populate form with existing data
      setFormData({
        type: feedback.type,
        title: feedback.title,
        description: feedback.description,
        pageUrl: feedback.pageUrl || '',
        browserInfo: feedback.browserInfo || '',
      });
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to load feedback');
      router.push('/feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.title.length < 5) {
      toast.error('Title must be at least 5 characters');
      return;
    }

    if (formData.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    try {
      setSubmitting(true);
      await feedbackAPI.update(params.id as string, formData);
      toast.success('Feedback updated successfully!');
      router.push(`/feedback/${params.id}`);
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to update feedback');
    } finally {
      setSubmitting(false);
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

  return (
    <DashboardLayout>
      <div className="p-8 max-w-4xl mx-auto">
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
                href: '/feedback',
              },
              {
                label: 'Edit Feedback',
              },
            ]}
          />

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4">
            Edit Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Update your feedback information
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as FeedbackType })
                }
                required
              >
                <option value={FeedbackType.BUG}>🐛 Bug - Something isn't working</option>
                <option value={FeedbackType.FEATURE_REQUEST}>
                  ✨ Feature Request - Suggest a new feature
                </option>
                <option value={FeedbackType.IMPROVEMENT}>
                  💡 Improvement - Enhance existing feature
                </option>
                <option value={FeedbackType.OTHER}>💬 Other - General feedback</option>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Brief summary of your feedback"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                maxLength={200}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={6}
                placeholder="Describe your feedback in detail. For bugs, include steps to reproduce..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Page URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Page URL (optional)
              </label>
              <Input
                type="url"
                placeholder="Where did you encounter this?"
                value={formData.pageUrl}
                onChange={(e) =>
                  setFormData({ ...formData, pageUrl: e.target.value })
                }
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This helps us locate the issue faster
              </p>
            </div>

            {/* Browser Info (read-only) */}
            {formData.browserInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Browser Information
                </label>
                <Input
                  type="text"
                  value={formData.browserInfo}
                  readOnly
                  className="bg-gray-50 dark:bg-gray-900"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Original browser information (cannot be modified)
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/feedback/${params.id}`)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Feedback'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
