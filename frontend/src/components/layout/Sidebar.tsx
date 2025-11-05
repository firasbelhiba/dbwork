'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { projectsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: 'Issues',
    href: '/issues',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

const feedbackNavItem: NavItem = {
  name: 'Feedback',
  href: '/feedback',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  ),
};

const reportsNavItem: NavItem = {
  name: 'Reports',
  href: '/reports',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      // Admin sees all projects, regular users see only their projects
      const response = user?.role === UserRole.ADMIN
        ? await projectsAPI.getAll()
        : await projectsAPI.getMyProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  return (
    <aside
      className={cn(
        'bg-white dark:bg-dark-500 border-r border-gray-200 dark:border-dark-400 flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-4 hover:bg-gray-50 dark:hover:bg-dark-400 transition-colors border-b border-gray-200 dark:border-dark-400"
      >
        <svg
          className={cn('w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform', collapsed && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
          />
        </svg>
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main navigation */}
        <div className="px-3 space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
                )}
                title={collapsed ? item.name : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* Reports link - Admin only */}
          {user?.role === UserRole.ADMIN && (
            <Link
              href={reportsNavItem.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === reportsNavItem.href || pathname.startsWith(reportsNavItem.href + '/')
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={collapsed ? reportsNavItem.name : undefined}
            >
              {reportsNavItem.icon}
              {!collapsed && <span>{reportsNavItem.name}</span>}
            </Link>
          )}

          {/* Users link - Admin only */}
          {user?.role === UserRole.ADMIN && (
            <Link
              href="/users"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === '/users' || pathname.startsWith('/users/')
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={collapsed ? 'Users' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {!collapsed && <span>Users</span>}
            </Link>
          )}

          {/* Activities link - Admin only */}
          {user?.role === UserRole.ADMIN && (
            <Link
              href="/admin/activity"
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === '/admin/activity' || pathname.startsWith('/admin/activity/')
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={collapsed ? 'Activities' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!collapsed && <span>Activities</span>}
            </Link>
          )}
        </div>

        {/* Projects section */}
        {!collapsed && (
          <div className="mt-6">
            <div className="px-6 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Projects
              </h3>
            </div>
            <div className="px-3 space-y-1">
              {projects.slice(0, 5).map((project) => {
                const isActive = pathname.includes(`/projects/${project._id}`);
                return (
                  <Link
                    key={project._id}
                    href={`/projects/${project._id}`}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
                    )}
                  >
                    <div className="w-5 h-5 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                        {project.key.substring(0, 2)}
                      </span>
                    </div>
                    <span className="truncate">{project.name}</span>
                  </Link>
                );
              })}
              {projects.length > 5 && (
                <Link
                  href="/projects"
                  className="block px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  View all projects
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Feedback at bottom */}
      <div className="border-t border-gray-200 dark:border-dark-400 p-3">
        <Link
          href={feedbackNavItem.href}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === feedbackNavItem.href || pathname.startsWith(feedbackNavItem.href + '/')
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          title={collapsed ? feedbackNavItem.name : undefined}
        >
          {feedbackNavItem.icon}
          {!collapsed && <span>{feedbackNavItem.name}</span>}
        </Link>
      </div>
    </aside>
  );
};
