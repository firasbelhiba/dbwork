'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, issuesAPI, reportsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Issue } from '@/types/issue';
import { UserRole } from '@/types/user';
import { Badge, Breadcrumb, LogoLoader } from '@/components/common';
import { RecentActivityWidget } from '@/components/activities/RecentActivityWidget';
import { MyCreatedTasksStats } from '@/components/charts/MyCreatedTasksStats';
import Link from 'next/link';

// Helper function to get display name for status (handles custom statuses)
// Uses projects list to look up custom status names
const getStatusDisplayName = (issue: Issue, projects: Project[]): string => {
  const status = issue.status as string;

  // Check if it's a custom status (starts with "custom_")
  if (status.startsWith('custom_')) {
    // First try from the issue's populated projectId
    if (typeof issue.projectId === 'object' && issue.projectId?.customStatuses) {
      const customStatus = issue.projectId.customStatuses.find(
        (cs) => cs.id === status
      );
      if (customStatus) {
        return customStatus.name;
      }
    }

    // Fallback: look up in projects list
    const projectId = typeof issue.projectId === 'object' ? issue.projectId._id : issue.projectId;
    const project = projects.find(p => p._id === projectId);
    if (project?.customStatuses) {
      const customStatus = project.customStatuses.find(cs => cs.id === status);
      if (customStatus) {
        return customStatus.name;
      }
    }

    // Final fallback: just show "Custom" if we can't find the name
    return 'Custom';
  }

  // Standard status - just replace underscores with spaces
  return status.replace(/_/g, ' ');
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedIssues, setAssignedIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading first
    if (authLoading) return;

    if (user?._id) {
      fetchDashboardData();
    } else {
      // Auth finished but no user - redirect to login
      window.location.href = '/login';
    }
  }, [user, authLoading]);

  const calculateStatsFromIssues = (issues: Issue[]) => {
    return {
      total: issues.length,
      bugs: issues.filter(i => i.type === 'bug').length,
      tasks: issues.filter(i => i.type === 'task').length,
      stories: issues.filter(i => i.type === 'story').length,
      epics: issues.filter(i => i.type === 'epic').length,
      critical: issues.filter(i => i.priority === 'critical').length,
      high: issues.filter(i => i.priority === 'high').length,
      medium: issues.filter(i => i.priority === 'medium').length,
      low: issues.filter(i => i.priority === 'low').length,
    };
  };

  const fetchDashboardData = async () => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const isAdmin = user?.role === UserRole.ADMIN;

      if (isAdmin) {
        // Admin: Get all projects, recent issues (limit 10), and global statistics
        const [projectsRes, issuesRes, statsRes] = await Promise.all([
          projectsAPI.getAll(),
          issuesAPI.getAll({ limit: 10 }),
          reportsAPI.getIssueStatistics(),
        ]);

        setProjects(projectsRes.data || []);
        const issuesData = issuesRes.data.items || issuesRes.data.issues || issuesRes.data;
        setAssignedIssues(Array.isArray(issuesData) ? issuesData : []);
        setStats(statsRes.data || {});
      } else {
        // Non-admin: Get user's projects and assigned issues (fetch more for accurate stats)
        const [projectsRes, issuesRes] = await Promise.all([
          projectsAPI.getMyProjects(),
          issuesAPI.getAll({ assignees: [user?._id], limit: 100 }),
        ]);

        setProjects(projectsRes.data || []);
        const issuesData = issuesRes.data.items || issuesRes.data.issues || issuesRes.data;
        const userIssues = Array.isArray(issuesData) ? issuesData : [];

        // Show only the 10 most recent issues in the list
        setAssignedIssues(userIssues.slice(0, 10));

        // Calculate statistics from all assigned issues
        setStats(calculateStatsFromIssues(userIssues));
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      // Set empty data on error to prevent infinite loading
      setProjects([]);
      setAssignedIssues([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading dashboard" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumb
          items={[
            {
              label: 'Home',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
          ]}
          className="mb-4 md:mb-6"
        />
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === UserRole.ADMIN
              ? "Here's an overview of all projects and issues"
              : "Here's what's happening with your projects"}
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Issues</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Bugs</p>
                  <p className="text-2xl md:text-3xl font-bold text-danger-500 mt-1">{stats.bugs}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Stories</p>
                  <p className="text-2xl md:text-3xl font-bold text-success-500 mt-1">{stats.stories}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-4 md:p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Critical</p>
                  <p className="text-2xl md:text-3xl font-bold text-warning-500 mt-1">{stats.critical}</p>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 md:w-6 md:h-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Created Tasks - Developer role only */}
        {user?.role === UserRole.DEVELOPER && (
          <div className="mb-6 md:mb-8">
            <MyCreatedTasksStats />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* My Issues */}
          <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 transition-colors">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.role === UserRole.ADMIN ? 'Recent Issues' : 'Assigned to Me'}
              </h2>
              <Link href="/issues" className="text-xs md:text-sm text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-dark-300">
              {assignedIssues.length === 0 ? (
                <div className="px-4 md:px-6 py-8 md:py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  {user?.role === UserRole.ADMIN ? 'No recent issues' : 'No issues assigned to you'}
                </div>
              ) : (
                assignedIssues.map((issue) => (
                  <Link
                    key={issue._id}
                    href={`/issues/${issue._id}`}
                    className="block px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 md:gap-2 mb-1 flex-wrap">
                          <Badge variant={issue.type as any}>{issue.type}</Badge>
                          <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                        </div>
                        <h3 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {issue.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {typeof issue.projectId === 'object' ? issue.projectId.key : ''}-{issue._id.slice(-4)}
                        </p>
                      </div>
                      <Badge variant={issue.status.startsWith('custom_') ? 'default' : issue.status as any} dot>
                        {getStatusDisplayName(issue, projects)}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* My Projects */}
          <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 transition-colors">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.role === UserRole.ADMIN ? 'All Projects' : 'My Projects'}
              </h2>
              <Link href="/projects" className="text-xs md:text-sm text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-dark-300">
              {projects.length === 0 ? (
                <div className="px-4 md:px-6 py-8 md:py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No projects found
                </div>
              ) : (
                projects.slice(0, 10).map((project) => (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}`}
                    className="block px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs md:text-sm font-bold text-primary-700 dark:text-primary-400">{project.key}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs md:text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {project.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Admin Activity Monitor Widget */}
        {user?.role === UserRole.ADMIN && (
          <div className="mt-4 md:mt-8">
            <RecentActivityWidget />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
