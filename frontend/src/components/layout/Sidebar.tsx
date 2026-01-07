'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { projectsAPI, organizationsAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Organization } from '@/types/organization';
import { UserRole } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useChatContext } from '@/contexts/ChatContext';
import { ChangelogModal } from '@/components/changelog';

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
  {
    name: 'Chat',
    href: '/chat',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose, isMobile = false }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useChatContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  const INITIAL_PROJECTS_COUNT = 5;

  // Handle link clicks on mobile - close the drawer
  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchOrganizations();
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

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Filter projects based on selected organization
  const filteredProjects = selectedOrganizationId
    ? projects.filter(p => p.organizationId === selectedOrganizationId)
    : projects;

  // On mobile, always show expanded
  const isCollapsed = isMobile ? false : collapsed;

  return (
    <aside
      className={cn(
        'bg-white dark:bg-dark-500 border-r border-gray-200 dark:border-dark-400 flex flex-col transition-all duration-300 h-full',
        isCollapsed ? 'w-16' : 'w-64',
        isMobile && 'w-full'
      )}
    >
      {/* Mobile header with close button */}
      {isMobile ? (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-400">
          <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-400 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        /* Desktop toggle button */
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
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main navigation */}
        <div className="px-3 space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const isChatItem = item.name === 'Chat';
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <div className="relative">
                  {item.icon}
                  {isChatItem && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-red-500 text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* Reports link - Admin only */}
          {user?.role === UserRole.ADMIN && (
            <Link
              href={reportsNavItem.href}
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === reportsNavItem.href || pathname.startsWith(reportsNavItem.href + '/')
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={isCollapsed ? reportsNavItem.name : undefined}
            >
              {reportsNavItem.icon}
              {!isCollapsed && <span>{reportsNavItem.name}</span>}
            </Link>
          )}

          {/* Users link - Admin only */}
          {user?.role === UserRole.ADMIN && (
            <Link
              href="/users"
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === '/users' || pathname.startsWith('/users/')
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={isCollapsed ? 'Users' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {!isCollapsed && <span>Users</span>}
            </Link>
          )}

          {/* Activities link - Admin only */}
          {user?.role === UserRole.ADMIN && (
            <Link
              href="/admin/activity"
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname === '/admin/activity' || pathname.startsWith('/admin/activity/')
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
              )}
              title={isCollapsed ? 'Activities' : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!isCollapsed && <span>Activities</span>}
            </Link>
          )}

        </div>

        {/* Projects section */}
        {!isCollapsed && (
          <div className="mt-6 flex flex-col min-h-0">
            <div className="px-6 mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Projects
              </h3>
              <div className="flex items-center gap-1">
                {/* Organization filter icons */}
                {organizations.length > 0 && (
                  <>
                    {/* All projects button */}
                    <button
                      onClick={() => {
                        setSelectedOrganizationId(null);
                        setShowAllProjects(false);
                      }}
                      className={cn(
                        'w-5 h-5 rounded flex items-center justify-center transition-all',
                        selectedOrganizationId === null
                          ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-white dark:ring-offset-dark-500'
                          : 'hover:bg-gray-100 dark:hover:bg-dark-400 opacity-60 hover:opacity-100'
                      )}
                      title="All Projects"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </button>
                    {/* Organization logos */}
                    {organizations.map((org) => {
                      const isSelected = selectedOrganizationId === org._id;
                      return (
                        <button
                          key={org._id}
                          onClick={() => {
                            setSelectedOrganizationId(isSelected ? null : org._id);
                            setShowAllProjects(false);
                          }}
                          className={cn(
                            'w-5 h-5 rounded flex-shrink-0 transition-all',
                            isSelected
                              ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-white dark:ring-offset-dark-500'
                              : 'opacity-60 hover:opacity-100'
                          )}
                          title={org.name}
                        >
                          {org.logo ? (
                            <img
                              src={org.logo}
                              alt={org.name}
                              className="w-5 h-5 rounded object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-primary-700 dark:text-primary-400">
                                {org.key.substring(0, 2)}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
                {/* Project count */}
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                  {filteredProjects.length}
                </span>
              </div>
            </div>
            {/* Scrollable projects container */}
            <div
              className={cn(
                "px-3 space-y-1",
                showAllProjects && "max-h-48 overflow-y-auto pr-1"
              )}
              style={showAllProjects ? {
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(156 163 175) transparent'
              } : undefined}
            >
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No projects in this organization
                </div>
              ) : (
                filteredProjects
                  .slice(0, showAllProjects ? filteredProjects.length : INITIAL_PROJECTS_COUNT)
                  .map((project) => {
                    const isActive = pathname.includes(`/projects/${project._id}`);
                    return (
                      <Link
                        key={project._id}
                        href={`/projects/${project._id}`}
                        onClick={handleLinkClick}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
                        )}
                      >
                        {project.logo ? (
                          <img
                            src={project.logo}
                            alt={project.name}
                            className="w-5 h-5 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                              {project.key.substring(0, 2)}
                            </span>
                          </div>
                        )}
                        <span className="truncate">{project.name}</span>
                      </Link>
                    );
                  })
              )}
            </div>
            {filteredProjects.length > INITIAL_PROJECTS_COUNT && (
              <div className="px-3 mt-1">
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full"
                >
                  <svg
                    className={cn("w-4 h-4 transition-transform", showAllProjects && "rotate-180")}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span>
                    {showAllProjects
                      ? 'Show less'
                      : `View more (${filteredProjects.length - INITIAL_PROJECTS_COUNT} more)`
                    }
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Feedback and Changelog at bottom */}
      <div className="border-t border-gray-200 dark:border-dark-400 p-3 space-y-1">
        <Link
          href={feedbackNavItem.href}
          onClick={handleLinkClick}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            pathname === feedbackNavItem.href || pathname.startsWith(feedbackNavItem.href + '/')
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          title={isCollapsed ? feedbackNavItem.name : undefined}
        >
          {feedbackNavItem.icon}
          {!isCollapsed && <span>{feedbackNavItem.name}</span>}
        </Link>

        <button
          onClick={() => setShowChangelogModal(true)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          title={isCollapsed ? 'Changelog' : undefined}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {!isCollapsed && <span>What's New</span>}
        </button>

        {/* Version Display */}
        {!isCollapsed && (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-center">
            Version 1.4.0
          </div>
        )}
      </div>

      {/* Changelog Modal - Only render when open */}
      {showChangelogModal && (
        <ChangelogModal
          isOpen={showChangelogModal}
          onClose={() => setShowChangelogModal(false)}
        />
      )}
    </aside>
  );
};
