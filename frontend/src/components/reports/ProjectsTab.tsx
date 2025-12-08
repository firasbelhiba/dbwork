'use client';

import React, { useState, useEffect } from 'react';
import { reportsAPI, projectsAPI, sprintsAPI } from '@/lib/api';
import { LogoLoader, Select } from '@/components/common';
import {
  BurndownChart,
  VelocityChart,
  IssueStatsPieChart,
  StatusDistributionChart,
  TeamWorkloadChart,
  IssueCreationTrendChart
} from '@/components/charts';
import { Project } from '@/types/project';
import { Sprint } from '@/types/sprint';

interface ProjectTimeAnalysis {
  project: { projectId: string; projectName: string };
  teamTimeBreakdown: Array<{ userId: string; userName: string; userAvatar: string | null; hours: number }>;
  issueLifecycle: {
    avgTimeInTodo: number;
    avgTimeInProgress: number;
    avgTimeInReview: number;
    avgTimeToComplete: number;
  };
  bottlenecks: Array<{ issueId: string; issueKey: string; title: string; status: string; daysStuck: number }>;
  summary: { totalIssues: number; totalTimeLogged: number; avgTimePerIssue: number };
}

const formatHours = (hours: number): string => {
  if (hours === 0) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const formatDays = (hours: number): string => {
  const days = hours / 24;
  if (days < 1) return formatHours(hours);
  return `${days.toFixed(1)} days`;
};

export const ProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Project reports data
  const [projectProgress, setProjectProgress] = useState<any>(null);
  const [issueStats, setIssueStats] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any>(null);
  const [velocityData, setVelocityData] = useState<any>(null);
  const [burndownData, setBurndownData] = useState<any>(null);
  const [statusDistribution, setStatusDistribution] = useState<any>(null);
  const [teamWorkload, setTeamWorkload] = useState<any>(null);
  const [issueCreationTrend, setIssueCreationTrend] = useState<any>(null);

  // New time analysis data
  const [timeAnalysis, setTimeAnalysis] = useState<ProjectTimeAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectSprints();
      fetchReports();
      fetchTimeAnalysis();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedSprintId) {
      fetchSprintReports();
    }
  }, [selectedSprintId]);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProjectId(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSprints = async () => {
    try {
      const response = await sprintsAPI.getByProject(selectedProjectId);
      setSprints(response.data);
      const activeSprint = response.data.find((s: Sprint) => s.status === 'active');
      if (activeSprint) {
        setSelectedSprintId(activeSprint._id);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const [progressRes, statsRes, teamRes, velocityRes, statusDistRes, workloadRes, trendRes] = await Promise.all([
        reportsAPI.getProjectProgress(selectedProjectId),
        reportsAPI.getIssueStatistics(selectedProjectId),
        reportsAPI.getTeamPerformance(selectedProjectId),
        reportsAPI.getVelocityTrend(selectedProjectId, 5),
        reportsAPI.getStatusDistribution(selectedProjectId),
        reportsAPI.getTeamWorkloadBreakdown(selectedProjectId),
        reportsAPI.getIssueCreationTrend(selectedProjectId, 30),
      ]);

      setProjectProgress(progressRes.data);
      setIssueStats(statsRes.data);
      setTeamPerformance(teamRes.data);
      setVelocityData(velocityRes.data);
      setStatusDistribution(statusDistRes.data);
      setTeamWorkload(workloadRes.data);
      setIssueCreationTrend(trendRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchSprintReports = async () => {
    try {
      const response = await reportsAPI.getSprintBurndown(selectedSprintId);
      setBurndownData(response.data);
    } catch (error) {
      console.error('Error fetching sprint reports:', error);
    }
  };

  const fetchTimeAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const response = await reportsAPI.getProjectTimeAnalysis(selectedProjectId);
      setTimeAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching time analysis:', error);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LogoLoader size="md" text="Loading projects" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project & Sprint Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            options={projects.map((p) => ({ value: p._id, label: p.name }))}
          />
          {sprints.length > 0 && (
            <Select
              label="Sprint (for Burndown)"
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              options={sprints.map((s) => ({ value: s._id, label: s.name }))}
            />
          )}
        </div>
      </div>

      {/* Time Analysis Section (NEW) */}
      {timeAnalysis && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Time Analysis</h2>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Time Logged</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatHours(timeAnalysis.summary.totalTimeLogged)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {timeAnalysis.summary.totalIssues}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Time per Issue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatHours(timeAnalysis.summary.avgTimePerIssue)}
              </p>
            </div>
          </div>

          {/* Team Time Breakdown */}
          {timeAnalysis.teamTimeBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Team Time Breakdown</h3>
              <div className="space-y-2">
                {timeAnalysis.teamTimeBreakdown.map((member) => {
                  const maxHours = Math.max(...timeAnalysis.teamTimeBreakdown.map(m => m.hours));
                  const percentage = maxHours > 0 ? (member.hours / maxHours) * 100 : 0;
                  return (
                    <div key={member.userId} className="flex items-center gap-3">
                      {member.userAvatar ? (
                        <img src={member.userAvatar} alt={member.userName} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                          {member.userName.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.userName}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{formatHours(member.hours)}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Issue Lifecycle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Issue Lifecycle (Avg Time)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatDays(timeAnalysis.issueLifecycle.avgTimeInTodo)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Todo</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatDays(timeAnalysis.issueLifecycle.avgTimeInProgress)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatDays(timeAnalysis.issueLifecycle.avgTimeInReview)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">In Review</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatDays(timeAnalysis.issueLifecycle.avgTimeToComplete)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total to Complete</p>
              </div>
            </div>
          </div>

          {/* Bottlenecks */}
          {timeAnalysis.bottlenecks.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Bottlenecks - Issues Stuck &gt; 7 Days
              </h3>
              <div className="space-y-2">
                {timeAnalysis.bottlenecks.slice(0, 5).map((issue) => (
                  <div key={issue.issueId} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{issue.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{issue.issueKey} - {issue.status.replace('_', ' ')}</p>
                    </div>
                    <span className="text-sm font-medium text-red-600 dark:text-red-400 ml-4">
                      {issue.daysStuck} days
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loadingAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex items-center justify-center">
            <LogoLoader size="sm" text="Loading time analysis" />
          </div>
        </div>
      )}

      {/* Project Progress */}
      {projectProgress && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Project Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectProgress.total}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</p>
              <p className="text-2xl font-bold text-success dark:text-success-400">{projectProgress.completed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-primary dark:text-primary-400">{projectProgress.inProgress}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {projectProgress.completionRate.toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-green-600 dark:bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${projectProgress.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        {statusDistribution?.distribution?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Issues by Status</h2>
            <StatusDistributionChart data={statusDistribution.distribution} />
          </div>
        )}

        {/* Issue Statistics by Type */}
        {issueStats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Issues by Type</h2>
            <IssueStatsPieChart
              data={[
                { name: 'Bugs', value: issueStats.bugs || 0 },
                { name: 'Tasks', value: issueStats.tasks || 0 },
                { name: 'Stories', value: issueStats.stories || 0 },
                { name: 'Epics', value: issueStats.epics || 0 },
              ].filter(item => item.value > 0)}
              colors={['#DE350B', '#0052CC', '#00875A', '#6554C0']}
            />
          </div>
        )}
      </div>

      {/* Issue Creation Trend */}
      {issueCreationTrend?.trend?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Issue Creation Trend (Last 30 Days)</h2>
          <IssueCreationTrendChart data={issueCreationTrend.trend} />
        </div>
      )}

      {/* Team Workload */}
      {teamWorkload?.workload?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Team Workload Distribution</h2>
          <TeamWorkloadChart data={teamWorkload.workload} />
        </div>
      )}

      {/* Velocity Trend */}
      {velocityData?.velocityData?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Velocity Trend (Last 5 Sprints)
          </h2>
          <VelocityChart
            data={velocityData.velocityData.map((s: any) => ({
              sprintName: s.sprintName,
              velocity: s.completedPoints,
              committed: s.totalPoints,
            }))}
            averageVelocity={velocityData.averageVelocity}
          />
          <div className="mt-4 text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Average Velocity: <strong className="dark:text-gray-200">{velocityData.averageVelocity.toFixed(1)}</strong> points/sprint
            </span>
          </div>
        </div>
      )}

      {/* Sprint Burndown */}
      {burndownData?.burndownData?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sprint Burndown Chart</h2>
          <BurndownChart
            data={burndownData.burndownData.map((d: any) => ({
              date: d.date,
              ideal: d.idealRemaining,
              actual: d.actualRemaining,
            }))}
          />
        </div>
      )}

      {/* Team Performance Table */}
      {teamPerformance?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Team Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    In Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Story Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {teamPerformance.map((member: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.user?.firstName} {member.user?.lastName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {member.completed}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {member.inProgress}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {member.storyPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
