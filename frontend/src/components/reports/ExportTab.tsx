'use client';

import React, { useState } from 'react';
import { reportsAPI } from '@/lib/api';
import { Button } from '@/components/common';
import toast from 'react-hot-toast';

interface ExportTabProps {
  startDate: string;
  endDate: string;
}

type ReportType = 'time_attendance' | 'team_productivity' | 'all';

export const ExportTab: React.FC<ExportTabProps> = ({ startDate, endDate }) => {
  const [reportType, setReportType] = useState<ReportType>('all');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch data based on report type
      let exportData: any = {};

      if (reportType === 'time_attendance' || reportType === 'all') {
        const timeAttendance = await reportsAPI.getTimeAttendance(startDate, endDate);
        exportData.timeAttendance = timeAttendance.data;
      }

      if (reportType === 'team_productivity' || reportType === 'all') {
        const teamProductivity = await reportsAPI.getTeamProductivity(startDate, endDate);
        exportData.teamProductivity = teamProductivity.data;
      }

      // Convert to CSV
      const csv = generateCSV(exportData, reportType);

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `report_${reportType}_${startDate}_to_${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = (data: any, type: ReportType): string => {
    const lines: string[] = [];

    if (type === 'time_attendance' || type === 'all') {
      if (data.timeAttendance?.dailyData) {
        lines.push('TIME & ATTENDANCE REPORT');
        lines.push(`Date Range: ${startDate} to ${endDate}`);
        lines.push('');

        // Summary
        lines.push('SUMMARY');
        lines.push(`Total Hours Worked,${data.timeAttendance.summary.totalHours.toFixed(2)}`);
        lines.push(`Average Daily Hours,${data.timeAttendance.summary.avgDailyHours.toFixed(2)}`);
        lines.push(`Total Extra Hours,${data.timeAttendance.summary.totalExtraHours.toFixed(2)}`);
        lines.push(`Users Under Target,${data.timeAttendance.summary.usersUnderTarget}`);
        lines.push('');

        // Daily Data
        lines.push('DAILY ATTENDANCE');
        lines.push('Employee,Date,Hours Worked,Regular Hours,Extra Hours,Target,Difference,Status');
        data.timeAttendance.dailyData.forEach((row: any) => {
          lines.push(`"${row.userName}","${row.date}",${row.hoursWorked.toFixed(2)},${row.regularHours.toFixed(2)},${row.extraHours.toFixed(2)},${row.target},${row.diff.toFixed(2)},"${row.status}"`);
        });
        lines.push('');

        // Alert Users
        if (data.timeAttendance.alertUsers?.length > 0) {
          lines.push('ATTENDANCE ALERTS');
          lines.push('Employee,Days Under Target');
          data.timeAttendance.alertUsers.forEach((user: any) => {
            lines.push(`"${user.userName}",${user.underDays}`);
          });
          lines.push('');
        }
      }
    }

    if (type === 'team_productivity' || type === 'all') {
      if (data.teamProductivity?.users) {
        if (type === 'all') lines.push('---');
        lines.push('TEAM PRODUCTIVITY REPORT');
        lines.push(`Date Range: ${startDate} to ${endDate}`);
        lines.push('');

        // Summary
        lines.push('SUMMARY');
        lines.push(`Total Issues Completed,${data.teamProductivity.summary.totalIssuesCompleted}`);
        lines.push(`Total Time Logged (hours),${data.teamProductivity.summary.totalTimeLogged.toFixed(2)}`);
        lines.push(`Total Extra Hours,${data.teamProductivity.summary.totalExtraHours.toFixed(2)}`);
        lines.push(`Active Users,${data.teamProductivity.summary.activeUsers}`);
        lines.push('');

        // User Data
        lines.push('INDIVIDUAL PERFORMANCE');
        lines.push('Employee,Email,Issues Completed,Avg Completion (days),Time Logged (hours),Extra Hours,Projects Worked On');
        data.teamProductivity.users.forEach((user: any) => {
          lines.push(`"${user.userName}","${user.userEmail}",${user.issuesCompleted},${user.avgCompletionDays.toFixed(1)},${user.totalTimeLogged.toFixed(2)},${user.extraHours.toFixed(2)},${user.projectsWorkedOn}`);
        });
      }
    }

    return lines.join('\n');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Export Reports</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Export your reports data to CSV format for further analysis or record-keeping.
        </p>

        {/* Date Range Display */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Selected Date Range</p>
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' - '}
            {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Report Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Report Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="all"
                checked={reportType === 'all'}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">All Reports</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Export all available report data</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="time_attendance"
                checked={reportType === 'time_attendance'}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Time & Attendance</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Daily hours, extra hours, and attendance alerts</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <input
                type="radio"
                name="reportType"
                value="team_productivity"
                checked={reportType === 'team_productivity'}
                onChange={(e) => setReportType(e.target.value as ReportType)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Team Productivity</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Individual performance, issues completed, time logged</p>
              </div>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={exporting}
          className="w-full sm:w-auto"
        >
          {exporting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to CSV
            </span>
          )}
        </Button>
      </div>

      {/* Export Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Export Information
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>- Reports are exported in CSV format for compatibility with Excel, Google Sheets, etc.</li>
          <li>- The export includes summary statistics and detailed records.</li>
          <li>- Use the date range picker above to select the period you want to export.</li>
          <li>- Large exports may take a few seconds to generate.</li>
        </ul>
      </div>
    </div>
  );
};
