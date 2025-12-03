'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button, Select, Input, Breadcrumb } from '@/components/common';
import { feedbackAPI } from '@/lib/api';
import { FeedbackType, FeedbackImage } from '@/types/feedback';
import toast from 'react-hot-toast';

export default function NewFeedbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: FeedbackType.BUG,
    title: '',
    description: '',
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    browserInfo:
      typeof window !== 'undefined'
        ? `${navigator.userAgent}`
        : '',
  });
  const [images, setImages] = useState<FeedbackImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file.type.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      toast.error('Only image files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const response = await feedbackAPI.uploadImage(file);
      setImages((prev) => [...prev, response.data]);
      toast.success('Image uploaded');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
      setLoading(true);
      await feedbackAPI.create({
        ...formData,
        images: images.length > 0 ? images : undefined,
      });
      toast.success('Feedback submitted successfully!');
      router.push('/feedback');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

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
                label: 'Submit Feedback',
              },
            ]}
          />

          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-4">
            Submit Feedback
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Help us improve by reporting bugs or suggesting new features
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
                onPaste={handlePasteImage}
                required
                maxLength={2000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.description.length}/2000 characters
              </p>
            </div>

            {/* Screenshots */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Screenshots (optional)
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Attach screenshots to help illustrate the issue. You can also paste images directly (Ctrl+V).
              </p>

              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-video relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <Image
                          src={image.url}
                          alt={image.fileName || `Screenshot ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {image.fileName && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {image.fileName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                    e.target.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="gap-2"
              >
                {uploadingImage ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Add Screenshot
                  </>
                )}
              </Button>
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
                Automatically captured to help diagnose issues
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
