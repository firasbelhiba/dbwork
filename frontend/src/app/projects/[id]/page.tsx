'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { projectsAPI, sprintsAPI, issuesAPI } from '@/lib/api';
import { Project } from '@/types/project';
import { Sprint } from '@/types/sprint';
import { Issue } from '@/types/issue';
import { User, UserRole } from '@/types/user';
import { KanbanBoard } from '@/components/kanban';
import { Button, Badge, Select, Breadcrumb, LogoLoader } from '@/components/common';
import { CreateSprintModal, SprintList } from '@/components/sprints';
import { UserProfileSidebar } from '@/components/users';
import { CustomStatusModal, AuditSection } from '@/components/projects';
import { ProjectCalendar, DemoEventModal } from '@/components/calendar';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const [view, setView] = useState<'board' | 'list' | 'calendar' | 'audits'>('board');
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [showSprintsList, setShowSprintsList] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);
  const [isCustomStatusModalOpen, setIsCustomStatusModalOpen] = useState(false);
  const [isDemoEventModalOpen, setIsDemoEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showArchived, setShowArchived] = useState(false);
  const [myTasksOnly, setMyTasksOnly] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kanban-myTasksOnly');
      return saved === 'true';
    }
    return false;
  });
  const [sortByStartDate, setSortByStartDate] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kanban-sortByStartDate');
      return saved === 'true';
    }
    return false;
  });
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  const [showSprintsMenu, setShowSprintsMenu] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kanban-selectedTeam') || 'all';
    }
    return 'all';
  });
  const [isTeamExpanded, setIsTeamExpanded] = useState(false);

  // Team category mapping
  const TEAM_CATEGORIES: Record<string, string[] | null> = {
    all: null, // no filter - show all issues
    dev: ['frontend', 'backend', 'fullstack', 'devops', 'qa', 'infrastructure', 'security'],
    design: ['design'],
    marketing: ['marketing', 'documentation'],
  };

  const TEAM_LABELS: Record<string, string> = {
    all: 'All',
    dev: 'Dev',
    design: 'Design',
    marketing: 'Marketing',
  };

  // Save to localStorage when myTasksOnly changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kanban-myTasksOnly', String(myTasksOnly));
    }
  }, [myTasksOnly]);

  // Save to localStorage when sortByStartDate changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kanban-sortByStartDate', String(sortByStartDate));
    }
  }, [sortByStartDate]);

  // Save to localStorage when selectedTeam changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kanban-selectedTeam', selectedTeam);
    }
  }, [selectedTeam]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowFiltersMenu(false);
        setShowSprintsMenu(false);
      }
    };

    if (showFiltersMenu || showSprintsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFiltersMenu, showSprintsMenu]);

  useEffect(() => {
    if (projectId && !authLoading) {
      fetchProjectData();
    }
  }, [projectId, authLoading, user]);

  useEffect(() => {
    if (projectId && view === 'list') {
      fetchIssues();
    }
  }, [projectId, selectedSprintId, view]);

  const fetchSprints = async () => {
    try {
      const [sprintsRes, activeSprintRes] = await Promise.all([
        sprintsAPI.getByProject(projectId),
        sprintsAPI.getActiveSprint(projectId).catch(() => ({ data: null })),
      ]);


      setSprints(sprintsRes.data);
      setActiveSprint(activeSprintRes.data);

      if (activeSprintRes.data) {
        setSelectedSprintId(activeSprintRes.data._id);
      }
    } catch (error) {
      console.error('Error fetching sprints:', error);
    }
  };

  const fetchProjectData = async () => {
    // Wait for auth to finish loading before checking authorization
    if (authLoading) {
      return;
    }

    try {
      const [projectRes, sprintsRes, activeSprintRes] = await Promise.all([
        projectsAPI.getById(projectId),
        sprintsAPI.getByProject(projectId),
        sprintsAPI.getActiveSprint(projectId).catch(() => ({ data: null })),
      ]);

      const projectData = projectRes.data;

      // Check authorization: Admin can see all projects, non-admin must be a member
      if (user?.role !== UserRole.ADMIN) {
        const isMember = projectData.members?.some((member: any) => {
          const memberId = typeof member.userId === 'object' ? member.userId._id : member.userId;
          return memberId === user?._id;
        });

        if (!isMember) {
          setUnauthorized(true);
          setLoading(false);
          toast.error('You do not have access to this project');
          return;
        }
      }

      setProject(projectData);
      setSprints(sprintsRes.data);
      setActiveSprint(activeSprintRes.data);

      if (activeSprintRes.data) {
        setSelectedSprintId(activeSprintRes.data._id);
      }
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    setLoadingIssues(true);
    try {
      const params: any = { projectId };
      if (selectedSprintId !== 'all') {
        params.sprintId = selectedSprintId;
      }
      const response = await issuesAPI.getAll(params);
      const issuesData = response.data.items || response.data.issues || response.data;
      setIssues(Array.isArray(issuesData) ? issuesData : []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      setIssues([]);
    } finally {
      setLoadingIssues(false);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 10, 150)); // Max 150%
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 10, 50)); // Min 50%
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LogoLoader size="lg" text="Loading project" />
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
            <p className="text-gray-600 dark:text-gray-400 mt-2">You don't have permission to view this project.</p>
            <Button onClick={() => router.push('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!project) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Project not found</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">The project you're looking for doesn't exist.</p>
            <Link href="/projects">
              <Button className="mt-4">Back to Projects</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Project Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
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
                label: 'Projects',
                href: '/projects',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ),
              },
              {
                label: project.name,
              },
            ]}
            className="mb-4"
          />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {project.logo ? (
                <img
                  src={project.logo}
                  alt={`${project.name} logo`}
                  className="w-12 h-12 rounded object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-primary/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{project.key}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{project.name}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{project.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/projects/${projectId}/settings`}>
                <Button variant="outline">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>

          {/* Team Members */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Team:</span>
              <div className="flex flex-wrap gap-2 items-center">
                {(isTeamExpanded ? project.members : project.members?.slice(0, 5))?.map((member, index) => {
                  const memberUser = typeof member.userId === 'object' ? member.userId : null;
                  return memberUser ? (
                    <div key={index} className="relative group">
                      {memberUser.avatar ? (
                        <img
                          src={memberUser.avatar}
                          alt={`${memberUser.firstName} ${memberUser.lastName}`}
                          className="w-9 h-9 rounded-full object-cover shadow-sm border-2 border-white dark:border-gray-700 cursor-pointer transition-transform hover:scale-110"
                          onClick={() => {
                            setSelectedUser(memberUser);
                            setIsProfileSidebarOpen(true);
                          }}
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full bg-primary-600 dark:bg-primary-500 text-white flex items-center justify-center text-xs font-medium shadow-sm border-2 border-white dark:border-gray-700 cursor-pointer transition-transform hover:scale-110"
                          onClick={() => {
                            setSelectedUser(memberUser);
                            setIsProfileSidebarOpen(true);
                          }}
                        >
                          {getInitials(memberUser.firstName, memberUser.lastName)}
                        </div>
                      )}
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
                        <div className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
                          <p className="text-sm font-medium">{memberUser.firstName} {memberUser.lastName}</p>
                          <p className="text-xs text-gray-300 dark:text-gray-400 capitalize">{memberUser.role}</p>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })}
                {project.members && project.members.length > 5 && (
                  <button
                    onClick={() => setIsTeamExpanded(!isTeamExpanded)}
                    className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center text-xs font-medium shadow-sm border-2 border-white dark:border-gray-700 cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title={isTeamExpanded ? 'Show less' : `Show ${project.members.length - 5} more`}
                  >
                    {isTeamExpanded ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      `+${project.members.length - 5}`
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Team Tabs - Filter by team/category */}
          {view === 'board' && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                {Object.entries(TEAM_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTeam(key)}
                    className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                      selectedTeam === key
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Sprint Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sprint:</span>
                <select
                  value={selectedSprintId}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Issues</option>
                  {sprints.map((sprint) => (
                    <option key={sprint._id} value={sprint._id}>
                      {sprint.name} {sprint.status === 'active' && '(Active)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
                <button
                  onClick={() => setView('board')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    view === 'board'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Board
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
                  onClick={() => setView('audits')}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    view === 'audits'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Audits
                </button>
              </div>

              {/* Board View Controls */}
              {view === 'board' && (
                <>
                  {/* Filters Dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFiltersMenu(!showFiltersMenu)}
                      className={`${(myTasksOnly || showArchived || sortByStartDate) ? 'border-primary dark:border-primary' : ''}`}
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filters
                      {(myTasksOnly || showArchived || sortByStartDate) && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                          {(myTasksOnly ? 1 : 0) + (showArchived ? 1 : 0) + (sortByStartDate ? 1 : 0)}
                        </span>
                      )}
                    </Button>
                    {showFiltersMenu && (
                      <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filter & Sort</h3>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                          <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="text-sm text-gray-700 dark:text-gray-300">My Tasks Only</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setMyTasksOnly(!myTasksOnly)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors border ${
                                myTasksOnly
                                  ? 'bg-primary border-primary'
                                  : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform ${
                                  myTasksOnly
                                    ? 'translate-x-5 bg-white'
                                    : 'translate-x-0.5 bg-gray-500 dark:bg-gray-300'
                                }`}
                              />
                            </button>
                          </label>
                          <label className="flex items-center justify-between cursor-pointer group">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                              </svg>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Show Archived</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowArchived(!showArchived)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors border ${
                                showArchived
                                  ? 'bg-primary border-primary'
                                  : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform ${
                                  showArchived
                                    ? 'translate-x-5 bg-white'
                                    : 'translate-x-0.5 bg-gray-500 dark:bg-gray-300'
                                }`}
                              />
                            </button>
                          </label>
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                            <label className="flex items-center justify-between cursor-pointer group">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm text-gray-700 dark:text-gray-300">Sort by Start Date</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSortByStartDate(!sortByStartDate)}
                                aria-label="Toggle sort by start date"
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors border ${
                                  sortByStartDate
                                    ? 'bg-primary border-primary'
                                    : 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                                }`}
                              >
                                <span
                                  className={`inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform ${
                                    sortByStartDate
                                      ? 'translate-x-5 bg-white'
                                      : 'translate-x-0.5 bg-gray-500 dark:bg-gray-300'
                                  }`}
                                />
                              </button>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Zoom Controls - Compact */}
                  <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-md p-0.5">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 50}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Zoom Out"
                    >
                      <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors min-w-[45px]"
                      title="Reset Zoom"
                    >
                      {zoomLevel}%
                    </button>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 150}
                      className="p-1.5 rounded hover:bg-white dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Zoom In"
                    >
                      <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Manage Columns */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomStatusModalOpen(true)}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Columns
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Calendar Event Button */}
              {view === 'calendar' && (user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEvent(null);
                    setIsDemoEventModalOpen(true);
                  }}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Event
                </Button>
              )}

              {/* Sprint Management Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSprintsMenu(!showSprintsMenu)}
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Sprints
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
                {showSprintsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={() => {
                        setShowSprintsList(!showSprintsList);
                        setShowSprintsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Manage Sprints ({sprints.length})
                    </button>
                    <button
                      onClick={() => {
                        setIsSprintModalOpen(true);
                        setShowSprintsMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Sprint
                    </button>
                  </div>
                )}
              </div>

              {/* Create Issue Button */}
              <Link href={`/issues/new?project=${projectId}`}>
                <Button size="sm">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Issue
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Sprint Management Section */}
        {showSprintsList && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sprint Management</h2>
              <button
                onClick={() => setShowSprintsList(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SprintList sprints={sprints} onSprintUpdated={fetchSprints} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-8">
          {view === 'board' ? (
            <KanbanBoard
              key={project?.customStatuses?.length || 0}
              projectId={projectId}
              sprintId={selectedSprintId === 'all' ? undefined : selectedSprintId}
              zoomLevel={zoomLevel}
              showArchived={showArchived}
              myTasksOnly={myTasksOnly}
              sortByStartDate={sortByStartDate}
              teamCategories={TEAM_CATEGORIES[selectedTeam] || undefined}
            />
          ) : view === 'calendar' ? (
            <ProjectCalendar
              events={project?.demoEvents || []}
              onEventClick={(event) => {
                setSelectedEvent(event);
                setIsDemoEventModalOpen(true);
              }}
            />
          ) : view === 'audits' ? (
            <div className="p-6">
              <AuditSection projectId={projectId} />
            </div>
          ) : loadingIssues ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading issues...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {issues.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No issues found</p>
                  <p className="text-sm mt-1">Create your first issue to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {issues.map((issue) => (
                    <Link
                      key={issue._id}
                      href={`/issues/${issue._id}`}
                      className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={issue.type as any}>{issue.type}</Badge>
                            <Badge variant={issue.priority as any}>{issue.priority}</Badge>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{issue.key}</span>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                            {issue.title}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            {issue.assignees && issue.assignees.length > 0 ? (
                              <span>
                                Assigned to: {issue.assignees.map((a: any) =>
                                  typeof a === 'object' ? `${a.firstName} ${a.lastName}` : 'Unknown'
                                ).join(', ')}
                              </span>
                            ) : (
                              <span>Unassigned</span>
                            )}
                          </div>
                        </div>
                        <Badge variant={issue.status as any} dot>
                          {issue.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Sprint Modal */}
        <CreateSprintModal
          isOpen={isSprintModalOpen}
          onClose={() => setIsSprintModalOpen(false)}
          projectId={projectId}
          onSprintCreated={fetchSprints}
        />

        {/* User Profile Sidebar */}
        <UserProfileSidebar
          user={selectedUser}
          isOpen={isProfileSidebarOpen}
          onClose={() => {
            setIsProfileSidebarOpen(false);
            setSelectedUser(null);
          }}
        />

        {/* Custom Status Modal */}
        {project && (
          <CustomStatusModal
            projectId={projectId}
            statuses={project.customStatuses || []}
            isOpen={isCustomStatusModalOpen}
            onClose={() => setIsCustomStatusModalOpen(false)}
            onUpdate={() => {
              fetchProjectData();
            }}
          />
        )}

        {/* Demo Event Modal */}
        <DemoEventModal
          projectId={projectId}
          event={selectedEvent}
          isOpen={isDemoEventModalOpen}
          onClose={() => {
            setIsDemoEventModalOpen(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            fetchProjectData();
          }}
          canEdit={user?.role === UserRole.ADMIN || user?.role === UserRole.PROJECT_MANAGER}
          projectMembers={project?.members || []}
        />
      </div>
    </DashboardLayout>
  );
}
