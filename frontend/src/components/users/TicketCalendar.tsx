'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { issuesAPI } from '@/lib/api';
import { LogoLoader } from '@/components/common/LogoLoader';

interface CalendarTicket {
  _id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  type: string;
  isStartDate: boolean;
  isDueDate: boolean;
  projectKey: string;
  projectLogo: string | null;
}

interface TicketCalendarProps {
  userId: string;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-danger-500',
  high: 'bg-warning-500',
  medium: 'bg-primary-500',
  low: 'bg-success-500',
};

const statusColors: Record<string, string> = {
  todo: 'bg-gray-400',
  in_progress: 'bg-primary-500',
  in_review: 'bg-purple-500',
  done: 'bg-success-500',
};

const typeIcons: Record<string, React.ReactNode> = {
  bug: (
    <svg className="w-3 h-3 text-danger-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M6.56 1.14a.75.75 0 01.177 1.045 3.989 3.989 0 00-.464.86c.185.17.382.329.59.473A3.993 3.993 0 0110 2c1.272 0 2.405.594 3.137 1.518.208-.144.405-.302.59-.473a3.989 3.989 0 00-.464-.86.75.75 0 011.222-.869c.369.519.65 1.105.822 1.736a.75.75 0 01-.174.707 7.03 7.03 0 01-1.299 1.098A4 4 0 0114 6c0 .52-.301.963-.723 1.187a6.961 6.961 0 01-.172 3.223 6.87 6.87 0 01-1.267 2.37l1.108 1.109a.75.75 0 01-1.06 1.06l-1.109-1.108a6.87 6.87 0 01-2.37 1.267 6.961 6.961 0 01-3.223.172A1.28 1.28 0 016 16a4 4 0 01-.166-1.833 7.03 7.03 0 01-1.098-1.299.75.75 0 01.707-.174c.631.172 1.217.453 1.736.822a.75.75 0 01-.869 1.222 3.989 3.989 0 00-.86-.464c.144.208.302.405.473.59A3.993 3.993 0 012 10c0-1.272.594-2.405 1.518-3.137a5.023 5.023 0 01-.473-.59 3.989 3.989 0 00.86.464.75.75 0 01.869-1.222 4.97 4.97 0 01-1.736-.822.75.75 0 01-.174-.707c.172-.631.453-1.217.822-1.736a.75.75 0 011.045-.177z" clipRule="evenodd" />
    </svg>
  ),
  task: (
    <svg className="w-3 h-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  story: (
    <svg className="w-3 h-3 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

export const TicketCalendar: React.FC<TicketCalendarProps> = ({ userId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [ticketsByDate, setTicketsByDate] = useState<Record<string, CalendarTicket[]>>({});
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDayTickets, setSelectedDayTickets] = useState<CalendarTicket[] | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetchCalendarTickets();
  }, [userId, year, month]);

  const fetchCalendarTickets = async () => {
    setLoading(true);
    try {
      const response = await issuesAPI.getUserCalendar(userId, year, month + 1);
      setTicketsByDate(response.data.byDate || {});
    } catch (error) {
      console.error('Error fetching calendar tickets:', error);
      setTicketsByDate({});
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

  const getTicketsForDate = (day: number): CalendarTicket[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return ticketsByDate[dateStr] || [];
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const tickets = getTicketsForDate(day);
    if (tickets.length > 0) {
      setSelectedDayTickets(tickets);
      setSelectedDayDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
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

  const CalendarContent = ({ expanded = false }: { expanded?: boolean }) => (
    <div className="w-full">
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
          <LogoLoader size="sm" text="Loading calendar" />
        </div>
      ) : (
        <div className={`grid grid-cols-7 ${expanded ? 'gap-2' : 'gap-1'}`}>
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className={expanded ? 'h-24' : 'h-10'} />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const tickets = getTicketsForDate(day);
            const hasTickets = tickets.length > 0;
            const todayClass = isToday(day)
              ? 'ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-dark-400'
              : '';

            // Count by type for indicator dots
            const hasDue = tickets.some(t => t.isDueDate);
            const hasStart = tickets.some(t => t.isStartDate);

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                disabled={!hasTickets}
                className={`
                  relative ${expanded ? 'h-28' : 'h-10'} w-full rounded ${expanded ? 'rounded-lg' : ''}
                  ${expanded ? 'text-sm' : 'text-sm'} font-medium transition-colors
                  ${todayClass}
                  ${hasTickets
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 cursor-pointer'
                    : 'bg-gray-100 dark:bg-dark-300 text-gray-700 dark:text-gray-300 cursor-default'
                  }
                `}
              >
                <span className={expanded ? 'absolute top-2 left-2' : ''}>{day}</span>

                {/* Compact view - show project logos */}
                {hasTickets && !expanded && (
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 pb-0.5">
                    {/* Show unique project logos (max 3) */}
                    {Array.from(new Map(tickets.filter(t => t.projectKey).map(t => [t.projectKey, t])).values())
                      .slice(0, 3)
                      .map((ticket) => (
                        ticket.projectLogo ? (
                          <img
                            key={ticket.projectKey}
                            src={ticket.projectLogo}
                            alt={ticket.projectKey || ''}
                            className="w-3 h-3 rounded-sm object-cover"
                            title={ticket.projectKey || ''}
                          />
                        ) : (
                          <div
                            key={ticket.projectKey}
                            className="w-3 h-3 rounded-sm bg-primary-500 flex items-center justify-center"
                            title={ticket.projectKey || ''}
                          >
                            <span className="text-[6px] font-bold text-white">
                              {ticket.projectKey?.charAt(0) || '?'}
                            </span>
                          </div>
                        )
                      ))}
                    {tickets.length > 3 && (
                      <span className="text-[8px] text-gray-500">+</span>
                    )}
                  </div>
                )}

                {/* Expanded view - show ticket previews */}
                {expanded && hasTickets && (
                  <div className="absolute top-7 bottom-1 left-1 right-1 flex flex-col gap-0.5 overflow-hidden">
                    {tickets.slice(0, 2).map((ticket) => (
                      <div
                        key={ticket._id}
                        className={`flex items-center gap-1 text-[9px] px-1 py-0.5 rounded truncate ${
                          ticket.isDueDate ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300' :
                          'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300'
                        }`}
                        title={`${ticket.key}: ${ticket.title}`}
                      >
                        {ticket.projectLogo ? (
                          <img src={ticket.projectLogo} alt="" className="w-3 h-3 rounded-sm object-cover flex-shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-sm bg-primary-500 text-white text-[6px] flex items-center justify-center flex-shrink-0">
                            {ticket.projectKey?.charAt(0) || '?'}
                          </span>
                        )}
                        <span className="truncate">{ticket.key}</span>
                      </div>
                    ))}
                    {tickets.length > 2 && (
                      <div className="text-[9px] text-gray-500 dark:text-gray-400 text-center">
                        +{tickets.length - 2} more
                      </div>
                    )}
                  </div>
                )}

                {/* Compact view - colored dots for due/start (top right corner) */}
                {!expanded && hasTickets && (
                  <div className="absolute top-0 right-0 flex gap-0.5 p-0.5">
                    {hasStart && <div className="w-1.5 h-1.5 rounded-full bg-success-500" title="Start date" />}
                    {hasDue && <div className="w-1.5 h-1.5 rounded-full bg-danger-500" title="Due date" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className={`${expanded ? 'mt-6' : 'mt-3'} flex flex-wrap ${expanded ? 'gap-4' : 'gap-2'}`}>
        <div className="flex items-center gap-1">
          <div className={`${expanded ? 'w-4 h-4' : 'w-2.5 h-2.5'} rounded-full bg-success-500`} />
          <span className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-600 dark:text-gray-400`}>Start</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={`${expanded ? 'w-4 h-4' : 'w-2.5 h-2.5'} rounded-full bg-danger-500`} />
          <span className={`${expanded ? 'text-sm' : 'text-xs'} text-gray-600 dark:text-gray-400`}>Due</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {/* Compact Calendar */}
      <CalendarContent expanded={false} />

      {/* Expanded Calendar Modal */}
      {isExpanded && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[100]"
            onClick={() => setIsExpanded(false)}
          />
          <div className="fixed inset-4 md:inset-8 lg:inset-16 z-[101] flex items-center justify-center">
            <div className="bg-white dark:bg-dark-400 rounded-xl shadow-2xl w-full h-full p-6 overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Ticket Calendar
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
        </>,
        document.body
      )}

      {/* Day Detail Modal */}
      {selectedDayTickets && selectedDayDate && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[102]"
            onClick={() => {
              setSelectedDayTickets(null);
              setSelectedDayDate(null);
            }}
          />
          <div className="fixed inset-0 z-[103] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-300">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Tickets for {new Date(selectedDayDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => {
                    setSelectedDayTickets(null);
                    setSelectedDayDate(null);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-dark-300 rounded transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
                {selectedDayTickets.map((ticket) => (
                  <Link
                    key={ticket._id}
                    href={`/issues/${ticket.key}`}
                    onClick={() => {
                      setSelectedDayTickets(null);
                      setSelectedDayDate(null);
                      setIsExpanded(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors border border-gray-200 dark:border-dark-200"
                  >
                    {/* Project logo */}
                    <div className="flex-shrink-0">
                      {ticket.projectLogo ? (
                        <img
                          src={ticket.projectLogo}
                          alt={ticket.projectKey}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                            {ticket.projectKey?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ticket info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {ticket.key}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${statusColors[ticket.status] || 'bg-gray-400'}`} />
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                        {ticket.title}
                      </p>
                    </div>

                    {/* Date type badges */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {ticket.isStartDate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300">
                          Start
                        </span>
                      )}
                      {ticket.isDueDate && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger-100 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300">
                          Due
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
