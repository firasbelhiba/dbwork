'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { projectsAPI, issuesAPI, reportsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Issue } from '@/types/issue';
import { UserRole } from '@/types/user';
import { Badge, Breadcrumb } from '@/components/common';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedIssues, setAssignedIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const isAdmin = user?.role === UserRole.ADMIN;

      const [projectsRes, issuesRes, statsRes] = await Promise.all([
        // Admin sees all projects, regular users see only their projects
        isAdmin ? projectsAPI.getAll() : projectsAPI.getMyProjects(),
        // Admin sees all recent issues, regular users see only assigned issues
        isAdmin
          ? issuesAPI.getAll({ limit: 10 })
          : issuesAPI.getAll({ assignee: user?._id, limit: 10 }),
        reportsAPI.getIssueStatistics(),
      ]);

      setProjects(projectsRes.data);
      // Handle backend response format: {items: [...], total, page, limit, pages}
      const issuesData = issuesRes.data.items || issuesRes.data.issues || issuesRes.data;
      setAssignedIssues(Array.isArray(issuesData) ? issuesData : []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              ),
            },
          ]}
          className="mb-6"
        />
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user?.role === UserRole.ADMIN
              ? "Here's an overview of all projects and issues"
              : "Here's what's happening with your projects"}
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Issues</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bugs</p>
                  <p className="text-3xl font-bold text-danger-500 mt-1">{stats.bugs}</p>
                </div>
                <div className="w-12 h-12 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-danger-600 dark:text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Stories</p>
                  <p className="text-3xl font-bold text-success-500 mt-1">{stats.stories}</p>
                </div>
                <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 p-6 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                  <p className="text-3xl font-bold text-warning-500 mt-1">{stats.critical}</p>
                </div>
                <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* My Issues */}
          <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 transition-colors">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.role === UserRole.ADMIN ? 'Recent Issues' : 'Assigned to Me'}
              </h2>
              <Link href="/issues" className="text-sm text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-dark-300">
              {assignedIssues.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  {user?.role === UserRole.ADMIN ? 'No recent issues' : 'No issues assigned to you'}
                </div>
              ) : (
                assignedIssues.map((issue) => (
                  <Link
                    key={issue._id}
                    href={`/issues/${issue._id}`}
                    className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={issue.type as any}>{issue.type}</Badge>
                          <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {issue.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {typeof issue.projectId === 'object' ? issue.projectId.key : ''}-{issue._id.slice(-4)}
                        </p>
                      </div>
                      <Badge variant={issue.status as any} dot>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* My Projects */}
          <div className="bg-white dark:bg-dark-400 rounded-lg shadow-sm border border-gray-200 dark:border-dark-300 transition-colors">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-300 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {user?.role === UserRole.ADMIN ? 'All Projects' : 'My Projects'}
              </h2>
              <Link href="/projects" className="text-sm text-primary-500 dark:text-primary-400 hover:text-primary-600 dark:hover:text-primary-300 font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-dark-300">
              {projects.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No projects found
                </div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}`}
                    className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary-700 dark:text-primary-400">{project.key}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
      </div>
    </DashboardLayout>
  );
}
