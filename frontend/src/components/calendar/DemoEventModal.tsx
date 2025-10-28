'use client';

import React, { useState, useEffect } from 'react';
import { DemoEvent } from '@/types/project';
import { Button, Input, Textarea } from '@/components/common';
import { User } from '@/types/user';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDateTime, getInitials } from '@/lib/utils';

interface DemoEventModalProps {
  projectId: string;
  event?: DemoEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canEdit: boolean; // Admin or PM can edit
}

export const DemoEventModal: React.FC<DemoEventModalProps> = ({
  projectId,
  event,
  isOpen,
  onClose,
  onSuccess,
  canEdit,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (event) {
      // Convert date to local datetime format for input
      const eventDate = new Date(event.date);
      const localDate = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000);
      const dateString = localDate.toISOString().slice(0, 16);

      setFormData({
        title: event.title,
        description: event.description || '',
        date: dateString,
        location: event.location || '',
      });
      setIsEditing(false);
    } else {
      setFormData({
        title: '',
        description: '',
        date: '',
        location: '',
      });
      setIsEditing(true);
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter an event title');
      return;
    }

    if (!formData.date) {
      toast.error('Please select a date and time');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: new Date(formData.date).toISOString(),
        location: formData.location.trim(),
      };

      if (event) {
        // Update existing event
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/demo-events/${event.id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Event updated successfully!');
      } else {
        // Create new event
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/demo-events`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Event created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    if (!confirm('Are you sure you want to delete this event?')) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/demo-events/${event.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Event deleted successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const creator = event && typeof event.createdBy === 'object' ? event.createdBy : null;
  const isViewMode = event && !isEditing;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-400 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-dark-300">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {event ? (isEditing ? 'Edit Event' : 'Event Details') : 'Create Demo Event'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {isViewMode ? (
              // View Mode
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Title
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 text-lg font-semibold">{event.title}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Date & Time
                  </label>
                  <p className="text-gray-900 dark:text-gray-100">📅 {formatDateTime(event.date)}</p>
                </div>

                {event.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Location
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">📍 {event.location}</p>
                  </div>
                )}

                {event.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Description
                    </label>
                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}

                {creator && (
                  <div className="pt-4 border-t border-gray-200 dark:border-dark-300">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Created By
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                        {getInitials(creator.firstName, creator.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {creator.firstName} {creator.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Edit/Create Mode
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Sprint 1 Demo, Client Review"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Location
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Zoom, Conference Room A"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Description
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add event details, agenda, or notes..."
                    rows={4}
                    disabled={loading}
                  />
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-dark-300">
            <div>
              {event && !isEditing && canEdit && (
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete Event
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {isViewMode ? (
                <>
                  <Button variant="secondary" onClick={onClose}>
                    Close
                  </Button>
                  {canEdit && (
                    <Button onClick={() => setIsEditing(true)}>
                      Edit Event
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (event) {
                        setIsEditing(false);
                      } else {
                        onClose();
                      }
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
