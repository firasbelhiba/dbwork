'use client';

import React, { useState } from 'react';
import { DemoEvent } from '@/types/project';
import { formatDate, formatDateTime } from '@/lib/utils';

interface ProjectCalendarProps {
  events: DemoEvent[];
  onEventClick?: (event: DemoEvent) => void;
}

export const ProjectCalendar: React.FC<ProjectCalendarProps> = ({ events, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === checkDate.getFullYear() &&
        eventDate.getMonth() === checkDate.getMonth() &&
        eventDate.getDate() === checkDate.getDate()
      );
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const today = new Date();
  const isToday = (day: number) => {
    return (
      today.getFullYear() === currentDate.getFullYear() &&
      today.getMonth() === currentDate.getMonth() &&
      today.getDate() === day
    );
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 dark:bg-gray-800/50" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isTodayDate = isToday(day);

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 dark:border-gray-700 p-2 overflow-y-auto ${
            isTodayDate ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
          }`}
        >
          <div className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="text-xs p-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors truncate"
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const renderListView = () => {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const upcomingEvents = sortedEvents.filter(e => new Date(e.date) >= today);
    const pastEvents = sortedEvents.filter(e => new Date(e.date) < today);

    return (
      <div className="space-y-6">
        {/* Upcoming Events */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Upcoming Events ({upcomingEvents.length})
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming events scheduled</p>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-600 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>📅 {formatDateTime(event.date)}</span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Past Events ({pastEvents.length})
            </h3>
            <div className="space-y-2">
              {pastEvents.reverse().map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition-colors opacity-75"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>📅 {formatDateTime(event.date)}</span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {view === 'calendar' && (
            <>
              <button
                onClick={previousMonth}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button
                onClick={nextMonth}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
          {view === 'list' && (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">All Events</h2>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              view === 'calendar'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              view === 'list'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Calendar/List Content */}
      <div className="p-6">
        {view === 'calendar' ? (
          <>
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-px mb-px">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
              {renderCalendarView()}
            </div>
          </>
        ) : (
          renderListView()
        )}
      </div>
    </div>
  );
};
