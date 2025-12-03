'use client';

import React, { useState, useEffect } from 'react';
import { DemoEvent, ProjectMember } from '@/types/project';
import { Button, Input, Textarea, MultiUserSelect } from '@/components/common';
import { User } from '@/types/user';
import { googleCalendarAPI, usersAPI } from '@/lib/api';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDateTime, getInitials } from '@/lib/utils';

type InviteOption = 'none' | 'all' | 'select';

interface DemoEventModalProps {
  projectId: string;
  event?: DemoEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canEdit: boolean; // Admin or PM can edit
  projectMembers?: ProjectMember[]; // Project members for attendee selection
}

export const DemoEventModal: React.FC<DemoEventModalProps> = ({
  projectId,
  event,
  isOpen,
  onClose,
  onSuccess,
  canEdit,
  projectMembers = [],
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    createGoogleMeet: false,
  });
  const [inviteOption, setInviteOption] = useState<InviteOption>('all');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [checkingGoogleStatus, setCheckingGoogleStatus] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Check Google Calendar connection status
  useEffect(() => {
    const checkGoogleStatus = async () => {
      setCheckingGoogleStatus(true);
      try {
        const response = await googleCalendarAPI.getStatus();
        setGoogleCalendarConnected(response.data.isConnected);
      } catch (error) {
        setGoogleCalendarConnected(false);
      } finally {
        setCheckingGoogleStatus(false);
      }
    };

    if (isOpen && canEdit) {
      checkGoogleStatus();
    }
  }, [isOpen, canEdit]);

  // Fetch all users for attendee selection
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await usersAPI.getAll({ limit: 100, isActive: true });
        // Handle paginated response
        const users = response.data.items || response.data;
        setAllUsers(users.filter((u: User) => u.isActive !== false));
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOpen && canEdit) {
      fetchAllUsers();
    }
  }, [isOpen, canEdit]);

  useEffect(() => {
    if (event) {
      // Convert date to local datetime format for input
      const eventDate = new Date(event.date);
      const localDate = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000);
      const dateString = localDate.toISOString().slice(0, 16);

      let endDateString = '';
      if (event.endDate) {
        const endEventDate = new Date(event.endDate);
        const localEndDate = new Date(endEventDate.getTime() - endEventDate.getTimezoneOffset() * 60000);
        endDateString = localEndDate.toISOString().slice(0, 16);
      }

      setFormData({
        title: event.title,
        description: event.description || '',
        date: dateString,
        endDate: endDateString,
        location: event.location || '',
        createGoogleMeet: false,
      });
      setInviteOption('all');
      setSelectedAttendeeIds([]);
      setIsEditing(false);
    } else {
      setFormData({
        title: '',
        description: '',
        date: '',
        endDate: '',
        location: '',
        createGoogleMeet: false,
      });
      setInviteOption('all'); // Default to invite all for new events
      setSelectedAttendeeIds([]);
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

    // Validate Google Meet option
    if (formData.createGoogleMeet && !googleCalendarConnected) {
      toast.error('Please connect your Google Calendar first in Profile settings');
      return;
    }

    // Validate attendee selection
    if (formData.createGoogleMeet && inviteOption === 'select' && selectedAttendeeIds.length === 0) {
      toast.error('Please select at least one attendee');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const payload: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: new Date(formData.date).toISOString(),
        location: formData.location.trim(),
      };

      if (formData.endDate) {
        payload.endDate = new Date(formData.endDate).toISOString();
      }

      // Only include Google Meet options for new events
      if (!event && formData.createGoogleMeet) {
        payload.createGoogleMeet = true;
        payload.inviteAllMembers = inviteOption === 'all';

        // If selecting specific attendees, get their emails from all users
        if (inviteOption === 'select' && selectedAttendeeIds.length > 0) {
          const selectedEmails = allUsers
            .filter(user => selectedAttendeeIds.includes(user._id))
            .map(user => user.gmailEmail || user.email);
          payload.attendees = selectedEmails;
        }
      }

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
        toast.success(
          formData.createGoogleMeet
            ? 'Event created with Google Meet link! Attendees will receive calendar invites.'
            : 'Event created successfully!'
        );
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

  const handleConnectGoogle = async () => {
    try {
      const response = await googleCalendarAPI.getAuthUrl();
      // Redirect to Google OAuth
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to get Google authorization URL');
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
                  <p className="text-gray-900 dark:text-gray-100">
                    <span className="mr-2">📅</span>
                    {formatDateTime(event.date)}
                    {event.endDate && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {' → '}{formatDateTime(event.endDate)}
                      </span>
                    )}
                  </p>
                </div>

                {event.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Location
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">📍 {event.location}</p>
                  </div>
                )}

                {/* Google Meet Link */}
                {event.googleMeetLink && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Google Meet
                    </label>
                    <a
                      href={event.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12.75c1.63 0 3.07.39 4.24.9 1.08.48 1.76 1.56 1.76 2.73V18H6v-1.62c0-1.17.68-2.25 1.76-2.73 1.17-.51 2.61-.9 4.24-.9zM12 12c1.93 0 3.5-1.57 3.5-3.5S13.93 5 12 5 8.5 6.57 8.5 8.5 10.07 12 12 12z"/>
                      </svg>
                      Join Google Meet
                    </a>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {event.googleMeetLink}
                    </p>
                  </div>
                )}

                {/* Attendees */}
                {event.attendees && event.attendees.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Attendees ({event.attendees.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {event.attendees.map((email, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 rounded text-sm"
                        >
                          {email}
                        </span>
                      ))}
                    </div>
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
                      {creator.avatar ? (
                        <img
                          src={creator.avatar}
                          alt={`${creator.firstName} ${creator.lastName}`}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                          {getInitials(creator.firstName, creator.lastName)}
                        </div>
                      )}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Start Date & Time <span className="text-red-500">*</span>
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
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-200 rounded-md bg-white dark:bg-dark-300 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Location
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Conference Room A, Building 1"
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

                {/* Google Meet Integration - Only for new events */}
                {!event && (
                  <div className="border-t border-gray-200 dark:border-dark-300 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V19z"/>
                      </svg>
                      Google Calendar Integration
                    </h3>

                    {checkingGoogleStatus ? (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Checking connection status...
                      </div>
                    ) : googleCalendarConnected ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Google Calendar connected
                        </div>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.createGoogleMeet}
                            onChange={(e) => setFormData({ ...formData, createGoogleMeet: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 dark:border-dark-200 text-blue-600 focus:ring-blue-500"
                            disabled={loading}
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Create Google Meet link
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              A video call link will be generated and shared with attendees
                            </p>
                          </div>
                        </label>

                        {formData.createGoogleMeet && (
                          <div className="ml-8 space-y-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Who should receive calendar invites?
                            </p>

                            {/* No invites option */}
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="inviteOption"
                                checked={inviteOption === 'none'}
                                onChange={() => setInviteOption('none')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                disabled={loading}
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  No invites
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Only create the event on my calendar
                                </p>
                              </div>
                            </label>

                            {/* Invite all option */}
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="inviteOption"
                                checked={inviteOption === 'all'}
                                onChange={() => setInviteOption('all')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                disabled={loading}
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  All project members
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Everyone on the team will receive calendar invitations
                                </p>
                              </div>
                            </label>

                            {/* Select specific option */}
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name="inviteOption"
                                checked={inviteOption === 'select'}
                                onChange={() => setInviteOption('select')}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                disabled={loading}
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  Select specific people
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Choose who should be invited
                                </p>
                              </div>
                            </label>

                            {/* Multi-select for specific attendees */}
                            {inviteOption === 'select' && (
                              <div className="ml-7 mt-2">
                                {loadingUsers ? (
                                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm py-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Loading users...
                                  </div>
                                ) : (
                                  <MultiUserSelect
                                    users={allUsers}
                                    selectedUserIds={selectedAttendeeIds}
                                    onChange={setSelectedAttendeeIds}
                                    placeholder="Select attendees from all users..."
                                    disabled={loading}
                                  />
                                )}
                                {selectedAttendeeIds.length === 0 && !loadingUsers && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Please select at least one attendee
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-dark-300 rounded-lg p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Connect your Google account to create events with Google Meet links and send calendar invites.
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleConnectGoogle}
                          className="flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          Connect Google Calendar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
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
