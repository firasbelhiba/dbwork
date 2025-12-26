'use client';

import React, { useState, useEffect } from 'react';
import { availabilityAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OUT_OF_OFFICE = 'out_of_office',
  VACATION = 'vacation',
  SICK = 'sick',
  MEETING = 'meeting',
}

interface AvailabilityEntry {
  _id: string;
  userId: string;
  date: string;
  status: AvailabilityStatus;
  note?: string;
  isAllDay: boolean;
  startTime?: string;
  endTime?: string;
}

interface AvailabilityCalendarProps {
  userId: string;
  canEdit?: boolean;
}

const statusConfig: Record<AvailabilityStatus, { label: string; color: string; bgColor: string }> = {
  [AvailabilityStatus.AVAILABLE]: {
    label: 'Available',
    color: 'text-success-600 dark:text-success-400',
    bgColor: 'bg-success-500',
  },
  [AvailabilityStatus.BUSY]: {
    label: 'Busy',
    color: 'text-warning-600 dark:text-warning-400',
    bgColor: 'bg-warning-500',
  },
  [AvailabilityStatus.OUT_OF_OFFICE]: {
    label: 'Out of Office',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-500',
  },
  [AvailabilityStatus.VACATION]: {
    label: 'Vacation',
    color: 'text-primary-600 dark:text-primary-400',
    bgColor: 'bg-primary-500',
  },
  [AvailabilityStatus.SICK]: {
    label: 'Sick',
    color: 'text-danger-600 dark:text-danger-400',
    bgColor: 'bg-danger-500',
  },
  [AvailabilityStatus.MEETING]: {
    label: 'In Meeting',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500',
  },
};

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  userId,
  canEdit = false,
}) => {
  const { user: currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>(AvailabilityStatus.AVAILABLE);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if current user can edit this user's availability
  const isOwnProfile = currentUser?._id === userId;
  const isAdmin = currentUser?.role === 'admin';
  const canModify = canEdit && (isOwnProfile || isAdmin);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchAvailability();
  }, [userId, year, month]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const response = await availabilityAPI.getMonthlyAvailability(userId, year, month + 1);
      setAvailability(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const getAvailabilityForDate = (day: number): AvailabilityEntry | undefined => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return availability.find((a) => a.date.startsWith(dateStr));
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    if (!canModify) return;
    const date = new Date(year, month, day);
    setSelectedDate(date);

    const existing = getAvailabilityForDate(day);
    if (existing) {
      setSelectedStatus(existing.status);
      setNote(existing.note || '');
    } else {
      setSelectedStatus(AvailabilityStatus.AVAILABLE);
      setNote('');
    }
    setShowModal(true);
  };

  const handleSaveAvailability = async () => {
    if (!selectedDate) return;

    setSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await availabilityAPI.create({
        date: dateStr,
        status: selectedStatus,
        note: note || undefined,
        isAllDay: true,
      });
      await fetchAvailability();
      setShowModal(false);
      setSelectedDate(null);
      setNote('');
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvailability = async () => {
    if (!selectedDate) return;

    setSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      await availabilityAPI.deleteByDate(userId, dateStr);
      await fetchAvailability();
      setShowModal(false);
      setSelectedDate(null);
      setNote('');
    } catch (error) {
      console.error('Error deleting availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  // Calendar content component to avoid duplication
  const CalendarContent = ({ expanded = false }: { expanded?: boolean }) => (
    <div className={expanded ? 'w-full' : 'w-full'}>
      {/* Header */}
      <div className={`flex items-center justify-between ${expanded ? 'mb-6' : 'mb-4'}`}>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className={`${expanded ? 'p-2' : 'p-1'} hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors`}
          >
            <svg className={`${expanded ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextMonth}
            className={`${expanded ? 'p-2' : 'p-1'} hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors`}
          >
            <svg className={`${expanded ? 'w-6 h-6' : 'w-5 h-5'} text-gray-600 dark:text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <h5 className={`${expanded ? 'text-xl' : 'text-sm'} font-semibold text-gray-900 dark:text-gray-100`}>
          {monthNames[month]} {year}
        </h5>
        {!expanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors"
            title="Expand calendar"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Day Names */}
      <div className={`grid grid-cols-7 ${expanded ? 'gap-2 mb-2' : 'gap-1 mb-1'}`}>
        {dayNames.map((day) => (
          <div
            key={day}
            className={`text-center ${expanded ? 'text-sm py-2' : 'text-xs py-1'} font-medium text-gray-500 dark:text-gray-400`}
          >
            {expanded ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNames.indexOf(day)] : day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className={`flex items-center justify-center ${expanded ? 'py-16' : 'py-8'}`}>
          <div className={`animate-spin rounded-full ${expanded ? 'h-8 w-8' : 'h-6 w-6'} border-b-2 border-primary-600`}></div>
        </div>
      ) : (
        <div className={`grid grid-cols-7 ${expanded ? 'gap-2' : 'gap-1'}`}>
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className={expanded ? 'h-20' : 'h-8'} />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const entry = getAvailabilityForDate(day);
            const todayClass = isToday(day)
              ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-dark-400'
              : '';

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={!canModify}
                className={`
                  relative ${expanded ? 'h-20 p-2' : 'h-8'} w-full rounded ${expanded ? 'rounded-lg' : ''} ${expanded ? 'text-base' : 'text-sm'} font-medium transition-colors
                  ${todayClass}
                  ${entry
                    ? `${statusConfig[entry.status].bgColor} text-white`
                    : 'bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300'
                  }
                  ${canModify ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
                `}
                title={entry ? `${statusConfig[entry.status].label}${entry.note ? `: ${entry.note}` : ''}` : ''}
              >
                <span className={expanded ? 'absolute top-2 left-2' : ''}>{day}</span>
                {expanded && entry && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-xs truncate block">{statusConfig[entry.status].label}</span>
                    {entry.note && (
                      <span className="text-xs opacity-75 truncate block">{entry.note}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className={`${expanded ? 'mt-6' : 'mt-4'} flex flex-wrap ${expanded ? 'gap-4' : 'gap-2'}`}>
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`${expanded ? 'w-4 h-4' : 'w-3 h-3'} rounded ${config.bgColor}`} />
            <span className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-600 dark:text-gray-400`}>{config.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Compact Calendar */}
      <CalendarContent expanded={false} />

      {/* Expanded Calendar Modal */}
      {isExpanded && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[55]"
            onClick={() => setIsExpanded(false)}
          />
          <div className="fixed inset-4 md:inset-8 lg:inset-16 z-[56] flex items-center justify-center">
            <div className="bg-white dark:bg-dark-400 rounded-xl shadow-2xl w-full h-full p-6 overflow-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Availability Calendar
                </h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CalendarContent expanded={true} />
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showModal && selectedDate && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Set Availability for {selectedDate.toLocaleDateString()}
              </h3>

              <div className="space-y-4">
                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as AvailabilityStatus)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {Object.entries(statusConfig).map(([status, config]) => (
                      <option key={status} value={status}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-200 rounded-lg bg-white dark:bg-dark-300 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={handleDeleteAvailability}
                  disabled={saving || !getAvailabilityForDate(selectedDate.getDate())}
                  className="px-3 py-2 text-sm text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAvailability}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
