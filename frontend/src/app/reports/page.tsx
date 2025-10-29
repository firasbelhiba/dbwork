'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { reportsAPI, projectsAPI, sprintsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Sprint } from '@/types/sprint';
import { Select, Breadcrumb, LogoLoader, Button } from '@/components/common';
import { BurndownChart, VelocityChart, IssueStatsPieChart } from '@/components/charts';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  const [projectProgress, setProjectProgress] = useState<any>(null);
  const [issueStats, setIssueStats] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any>(null);
  const [velocityData, setVelocityData] = useState<any>(null);
  const [burndownData, setBurndownData] = useState<any>(null);
  const [timeTracking, setTimeTracking] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user is admin
      if (user.role !== UserRole.ADMIN) {
        setUnauthorized(true);
        setLoading(false);
        toast.error('You do not have access to this page');
        return;
      }
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectSprints();
      fetchReports();
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
      const [progressRes, statsRes, teamRes, velocityRes, timeRes] = await Promise.all([
        reportsAPI.getProjectProgress(selectedProjectId),
        reportsAPI.getIssueStatistics(selectedProjectId),
        reportsAPI.getTeamPerformance(selectedProjectId),
        reportsAPI.getVelocityTrend(selectedProjectId, 5),
        reportsAPI.getTimeTracking(selectedProjectId),
      ]);

      setProjectProgress(progressRes.data);
      setIssueStats(statsRes.data);
      setTeamPerformance(teamRes.data);
      setVelocityData(velocityRes.data);
      setTimeTracking(timeRes.data);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading reports" />
        </div>
      </DashboardLayout>
    );
  }

  if (unauthorized) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-danger-100 dark:bg-danger-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to view reports. Only administrators can access this page.</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
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
              label: 'Reports',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
          ]}
          className="mb-6"
        />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track progress, performance, and insights</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-8">
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

        {/* Project Progress */}
        {projectProgress && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Project Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Issues</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{projectProgress.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-3xl font-bold text-success dark:text-success-400">{projectProgress.completed}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">In Progress</p>
                <p className="text-3xl font-bold text-primary dark:text-primary-400">{projectProgress.inProgress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {projectProgress.completionRate.toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-success dark:bg-success-500 h-4 rounded-full transition-all"
                style={{ width: `${projectProgress.completionRate}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Issue Statistics */}
          {issueStats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Issues by Type</h2>
              <IssueStatsPieChart
                data={[
                  { name: 'Bugs', value: issueStats.bugs },
                  { name: 'Tasks', value: issueStats.tasks },
                  { name: 'Stories', value: issueStats.stories },
                  { name: 'Epics', value: issueStats.epics || 0 },
                ]}
                colors={['#DE350B', '#0052CC', '#00875A', '#6554C0']}
              />
            </div>
          )}

          {/* Priority Distribution */}
          {issueStats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Issues by Priority</h2>
              <IssueStatsPieChart
                data={[
                  { name: 'Critical', value: issueStats.critical || 0 },
                  { name: 'High', value: issueStats.high || 0 },
                  { name: 'Medium', value: issueStats.medium || 0 },
                  { name: 'Low', value: issueStats.low || 0 },
                ].filter(item => item.value > 0)}
                colors={['#DE350B', '#FF5630', '#FF991F', '#6B7280']}
              />
            </div>
          )}
        </div>

        {/* Velocity Trend */}
        {velocityData && velocityData.sprints && velocityData.sprints.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Velocity Trend (Last 5 Sprints)
            </h2>
            <VelocityChart
              data={velocityData.sprints.map((s: any) => ({
                sprintName: s.name,
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
        {burndownData && burndownData.data && burndownData.data.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Sprint Burndown Chart</h2>
            <BurndownChart data={burndownData.data} />
          </div>
        )}

        {/* Team Performance */}
        {teamPerformance && teamPerformance.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Team Performance</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Team Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      In Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Story Points
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {teamPerformance.map((member: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {member.userName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {member.completed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {member.inProgress}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {member.totalStoryPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Time Tracking */}
        {timeTracking && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Time Tracking Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Hours</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {timeTracking.totalEstimatedHours.toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Logged Hours</p>
                <p className="text-2xl font-bold text-primary dark:text-primary-400">
                  {timeTracking.totalLoggedHours.toFixed(1)}h
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Variance</p>
                <p
                  className={`text-2xl font-bold ${
                    timeTracking.variance >= 0 ? 'text-success dark:text-success-400' : 'text-danger dark:text-danger-400'
                  }`}
                >
                  {timeTracking.variance > 0 ? '+' : ''}
                  {timeTracking.variance.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
